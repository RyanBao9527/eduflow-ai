import type { CourseBrief } from "@/features/course-wizard/course-brief-schema";
import {
  coursePlanGenerateResponseSchema,
  type CoursePlanGenerateResponse,
} from "@/features/course-generation/course-plan-schema";

const errorResponseSchema = {
  parse(value: unknown) {
    if (
      typeof value === "object" &&
      value !== null &&
      "error" in value &&
      typeof value.error === "object" &&
      value.error !== null
    ) {
      return value.error as {
        code?: unknown;
        message?: unknown;
        retryable?: unknown;
        requestId?: unknown;
      };
    }
    return null;
  },
};

export class CourseGenerationApiError extends Error {
  constructor(
    message: string,
    readonly code = "COURSE_GENERATION_FAILED",
    readonly retryable = true,
    readonly requestId?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "CourseGenerationApiError";
  }
}

export async function generateCoursePlan(
  brief: CourseBrief,
  signal?: AbortSignal,
): Promise<CoursePlanGenerateResponse> {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000").replace(
    /\/$/,
    "",
  );
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/v1/course-plans/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schemaVersion: "1.0", courseBrief: brief }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new CourseGenerationApiError("无法连接课程生成服务，请确认后端已启动。", "NETWORK_ERROR");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const apiError = errorResponseSchema.parse(payload);
    throw new CourseGenerationApiError(
      typeof apiError?.message === "string" ? apiError.message : "课程蓝图生成失败，请重试。",
      typeof apiError?.code === "string" ? apiError.code : "COURSE_GENERATION_FAILED",
      typeof apiError?.retryable === "boolean" ? apiError.retryable : response.status >= 500,
      typeof apiError?.requestId === "string" ? apiError.requestId : undefined,
      response.status,
    );
  }

  const parsed = coursePlanGenerateResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new CourseGenerationApiError(
      "课程生成服务返回了无法识别的数据，请重试。",
      "INVALID_API_RESPONSE",
    );
  }
  return parsed.data;
}
