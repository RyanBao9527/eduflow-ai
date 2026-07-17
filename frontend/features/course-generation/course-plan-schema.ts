import { z } from "zod";

import { courseBriefSchema, requestedResourceSchema } from "@/features/course-wizard/course-brief-schema";

const audienceAnalysisSchema = z.object({
  profile: z.string(),
  prerequisites: z.array(z.string()),
  learningNeeds: z.array(z.string()),
});

const learningObjectiveSchema = z.object({
  objectiveId: z.string(),
  statement: z.string(),
  evidence: z.string(),
});

const courseModuleSchema = z.object({
  moduleId: z.string(),
  title: z.string(),
  goal: z.string(),
  lessonIds: z.array(z.string()),
  keyConcepts: z.array(z.string()),
});

const coursePhaseSchema = z.object({
  phaseId: z.string(),
  title: z.string(),
  goal: z.string(),
  moduleIds: z.array(z.string()),
  lessonIds: z.array(z.string()),
  milestone: z.string(),
});

const lessonIndexItemSchema = z.object({
  lessonId: z.string(),
  moduleId: z.string(),
  lessonNumber: z.number().int(),
  title: z.string(),
  objective: z.string(),
  keyConcepts: z.array(z.string()),
  durationMinutes: z.number().int(),
});

const lessonDetailSchema = z.object({
  lessonId: z.string(),
  teachingActivities: z.array(z.string()),
  assessmentMethod: z.string(),
});

const teachingStrategySchema = z.object({
  approach: z.string(),
  learnerEngagement: z.string(),
  differentiation: z.array(z.string()),
});

const assessmentPlanSchema = z.object({
  diagnostic: z.string(),
  formative: z.string(),
  summative: z.string(),
});

const resourcePlanItemSchema = z.object({
  resourceType: requestedResourceSchema,
  purpose: z.string(),
  moduleIds: z.array(z.string()),
  lessonIds: z.array(z.string()),
});

const commonPlanShape = {
  schemaVersion: z.literal("1.0"),
  title: z.string(),
  positioning: z.string(),
  overview: z.string(),
  assumptions: z.array(z.string()),
  audienceAnalysis: audienceAnalysisSchema,
  learningObjectives: z.array(learningObjectiveSchema),
  modules: z.array(courseModuleSchema),
  lessonIndex: z.array(lessonIndexItemSchema),
  teachingStrategy: teachingStrategySchema,
  assessmentPlan: assessmentPlanSchema,
  resourcePlan: z.array(resourcePlanItemSchema),
  qualityChecklist: z.array(z.string()),
};

const detailedCoursePlanSchema = z.object({
  ...commonPlanShape,
  detailMode: z.literal("detailed"),
  lessonDetails: z.array(lessonDetailSchema),
});

const balancedCoursePlanSchema = z.object({
  ...commonPlanShape,
  detailMode: z.literal("balanced"),
  phases: z.array(coursePhaseSchema),
  keyLessonDetails: z.array(lessonDetailSchema),
});

export const coursePlanSchema = z.discriminatedUnion("detailMode", [
  detailedCoursePlanSchema,
  balancedCoursePlanSchema,
]);

export const tokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  promptCacheHitTokens: z.number().int().nonnegative(),
  promptCacheMissTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  estimatedCostUsd: z.number().nonnegative().nullable().optional(),
  pricingSnapshot: z.string().nullable().optional(),
});

export const generationMetadataSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  detailMode: z.enum(["detailed", "balanced"]),
  promptVersion: z.string(),
  attempts: z.number().int().min(1).max(2),
  generatedAt: z.string(),
  usage: tokenUsageSchema,
});

export const coursePlanGenerateResponseSchema = z.object({
  schemaVersion: z.literal("1.0"),
  requestId: z.string(),
  status: z.literal("succeeded"),
  coursePlan: coursePlanSchema,
  generation: generationMetadataSchema,
});

export const storedCourseGenerationSchema = z.object({
  version: z.literal(1),
  brief: courseBriefSchema,
  response: coursePlanGenerateResponseSchema,
  savedAt: z.string(),
});

export type CoursePlan = z.infer<typeof coursePlanSchema>;
export type LessonDetail = z.infer<typeof lessonDetailSchema>;
export type GenerationMetadata = z.infer<typeof generationMetadataSchema>;
export type TokenUsage = z.infer<typeof tokenUsageSchema>;
export type CoursePlanGenerateResponse = z.infer<typeof coursePlanGenerateResponseSchema>;
export type StoredCourseGeneration = z.infer<typeof storedCourseGenerationSchema>;
