import { z } from "zod";

import { tokenUsageSchema } from "@/features/course-generation/course-plan-schema";

export const RESOURCE_ARTIFACT_SCHEMA_VERSION = "1.0" as const;

export const resourceTypeSchema = z.enum(["lesson_plan", "slide_outline"]);
export const resourceArtifactStatusSchema = z.enum(["ready", "superseded"]);

export const resourceGenerationMetadataSchema = z.object({
  requestId: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  attempts: z.number().int().min(1).max(2),
  generatedAt: z.string().datetime(),
  usage: tokenUsageSchema,
});

export const lessonPlanStageSchema = z.object({
  stageId: z.string().min(1),
  title: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  teacherActivities: z.array(z.string().min(1)).min(1),
  learnerActivities: z.array(z.string().min(1)).min(1),
  assessment: z.string().min(1),
});

export const lessonPlanContentSchema = z.object({
  summary: z.string().min(1),
  objectives: z.array(z.string().min(1)).min(1),
  keyPoints: z.array(z.string().min(1)).min(1),
  difficultPoints: z.array(z.string().min(1)),
  preparation: z.array(z.string().min(1)),
  stages: z.array(lessonPlanStageSchema).min(1).max(10),
  assessment: z.string().min(1),
  differentiation: z.array(z.string().min(1)),
  extension: z.string(),
  assumptions: z.array(z.string().min(1)),
  qualityChecklist: z.array(z.string().min(1)),
});

export const slideOutlineItemSchema = z.object({
  slideId: z.string().regex(/^S\d{2}$/),
  title: z.string().min(1),
  purpose: z.string().min(1),
  keyPoints: z.array(z.string().min(1)).min(1).max(5),
  visualSuggestion: z.string().min(1),
  speakerNotes: z.string().min(1),
});

export const slideOutlineContentSchema = z.object({
  overview: z.string().min(1),
  slides: z.array(slideOutlineItemSchema).min(6).max(15),
  assumptions: z.array(z.string().min(1)),
  qualityChecklist: z.array(z.string().min(1)),
});

const resourceArtifactBaseShape = {
  schemaVersion: z.literal(RESOURCE_ARTIFACT_SCHEMA_VERSION),
  resourceId: z.string().uuid(),
  courseProjectId: z.string().min(1),
  moduleId: z.string().min(1),
  lessonId: z.string().min(1),
  title: z.string().min(1).max(160),
  status: resourceArtifactStatusSchema,
  version: z.number().int().positive(),
  replacesResourceId: z.string().uuid().nullable(),
  sourceProjectUpdatedAt: z.string().datetime(),
  generation: resourceGenerationMetadataSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};

const lessonPlanArtifactSchema = z.object({
  ...resourceArtifactBaseShape,
  resourceType: z.literal("lesson_plan"),
  content: lessonPlanContentSchema,
});

const slideOutlineArtifactSchema = z.object({
  ...resourceArtifactBaseShape,
  resourceType: z.literal("slide_outline"),
  content: slideOutlineContentSchema,
});

export const resourceArtifactSchema = z
  .discriminatedUnion("resourceType", [lessonPlanArtifactSchema, slideOutlineArtifactSchema])
  .superRefine((artifact, context) => {
    if (artifact.version === 1 && artifact.replacesResourceId !== null) {
      context.addIssue({
        code: "custom",
        path: ["replacesResourceId"],
        message: "首个资源版本不能替代其他版本",
      });
    }
    if (artifact.version > 1 && artifact.replacesResourceId === null) {
      context.addIssue({
        code: "custom",
        path: ["replacesResourceId"],
        message: "后续资源版本必须引用前一版本",
      });
    }
  });

export const resourceArtifactStoreSchema = z.object({
  schemaVersion: z.literal(RESOURCE_ARTIFACT_SCHEMA_VERSION),
  artifacts: z.array(z.unknown()),
});

const createResourceArtifactBaseShape = {
  courseProjectId: z.string().min(1),
  moduleId: z.string().min(1),
  lessonId: z.string().min(1),
  title: z.string().min(1).max(160),
  sourceProjectUpdatedAt: z.string().datetime(),
  generation: resourceGenerationMetadataSchema,
};

export const createResourceArtifactInputSchema = z.discriminatedUnion("resourceType", [
  z.object({
    ...createResourceArtifactBaseShape,
    resourceType: z.literal("lesson_plan"),
    content: lessonPlanContentSchema,
  }),
  z.object({
    ...createResourceArtifactBaseShape,
    resourceType: z.literal("slide_outline"),
    content: slideOutlineContentSchema,
  }),
]);

export type ResourceType = z.infer<typeof resourceTypeSchema>;
export type ResourceArtifactStatus = z.infer<typeof resourceArtifactStatusSchema>;
export type ResourceGenerationMetadata = z.infer<typeof resourceGenerationMetadataSchema>;
export type LessonPlanContent = z.infer<typeof lessonPlanContentSchema>;
export type SlideOutlineContent = z.infer<typeof slideOutlineContentSchema>;
export type ResourceArtifact = z.infer<typeof resourceArtifactSchema>;
export type CreateResourceArtifactInput = z.infer<typeof createResourceArtifactInputSchema>;
