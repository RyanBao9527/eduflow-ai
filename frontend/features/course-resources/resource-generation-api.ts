import { z } from "zod";

import {
  lessonPlanContentSchema,
  resourceGenerationMetadataSchema,
  resourceTypeSchema,
  slideOutlineContentSchema,
  type ResourceType,
} from "@/features/course-resources/resource-artifact-schema";
import type { CoursePlan } from "@/features/course-generation/course-plan-schema";
import type { CourseBrief } from "@/features/course-wizard/course-brief-schema";

const generatedResourceBaseShape = {
  moduleId: z.string().regex(/^M\d{2}$/),
  lessonId: z.string().regex(/^L\d{3}$/),
  title: z.string().min(2).max(160),
};

const generatedResourceSchema = z.discriminatedUnion("resourceType", [
  z.object({
    ...generatedResourceBaseShape,
    resourceType: z.literal("lesson_plan"),
    content: lessonPlanContentSchema,
  }),
  z.object({
    ...generatedResourceBaseShape,
    resourceType: z.literal("slide_outline"),
    content: slideOutlineContentSchema,
  }),
]);

const apiGenerationMetadataSchema = resourceGenerationMetadataSchema.omit({ requestId: true });

export const resourceGenerateResponseSchema = z.object({
  schemaVersion: z.literal("1.0"),
  requestId: z.string().min(1),
  status: z.literal("succeeded"),
  courseProjectId: z.string().uuid(),
  resource: generatedResourceSchema,
  generation: apiGenerationMetadataSchema,
});

export type ResourceGenerateResponse = z.infer<typeof resourceGenerateResponseSchema>;

export class ResourceGenerationApiError extends Error {
  constructor(
    message: string,
    readonly code = "RESOURCE_GENERATION_FAILED",
    readonly retryable = true,
    readonly requestId?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ResourceGenerationApiError";
  }
}

function readApiError(payload: unknown) {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("error" in payload) ||
    typeof payload.error !== "object" ||
    payload.error === null
  ) {
    return null;
  }
  return payload.error as {
    code?: unknown;
    message?: unknown;
    retryable?: unknown;
    requestId?: unknown;
  };
}

export async function generateLessonResource(
  input: {
    courseProjectId: string;
    resourceType: ResourceType;
    lessonId: string;
    courseBrief: CourseBrief;
    coursePlan: CoursePlan;
  },
  signal?: AbortSignal,
): Promise<ResourceGenerateResponse> {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000").replace(
    /\/$/,
    "",
  );

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/v1/resources/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schemaVersion: "1.0",
        courseProjectId: input.courseProjectId,
        resourceType: resourceTypeSchema.parse(input.resourceType),
        lessonId: input.lessonId,
        courseBrief: input.courseBrief,
        coursePlan: input.coursePlan,
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ResourceGenerationApiError(
      "无法连接资源生成服务，请确认后端已启动。",
      "NETWORK_ERROR",
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const apiError = readApiError(payload);
    throw new ResourceGenerationApiError(
      typeof apiError?.message === "string" ? apiError.message : "课程资源生成失败，请重试。",
      typeof apiError?.code === "string" ? apiError.code : "RESOURCE_GENERATION_FAILED",
      typeof apiError?.retryable === "boolean" ? apiError.retryable : response.status >= 500,
      typeof apiError?.requestId === "string" ? apiError.requestId : undefined,
      response.status,
    );
  }

  const parsed = resourceGenerateResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ResourceGenerationApiError(
      "资源生成服务返回了无法识别的数据，请重试。",
      "INVALID_API_RESPONSE",
    );
  }
  return parsed.data;
}
