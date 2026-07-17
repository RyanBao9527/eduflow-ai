import { z } from "zod";

import {
  coursePlanSchema,
  generationMetadataSchema,
} from "@/features/course-generation/course-plan-schema";
import { courseBriefSchema } from "@/features/course-wizard/course-brief-schema";
import { draftValuesSchema } from "@/features/course-wizard/draft-storage";

export const COURSE_PROJECT_SCHEMA_VERSION = "1.0" as const;

export const courseProjectStatusSchema = z.enum(["draft", "generated", "editing"]);

export const courseProjectGenerationSchema = generationMetadataSchema.extend({
  requestId: z.string().min(1),
});

export const courseProjectSchema = z
  .object({
    schemaVersion: z.literal(COURSE_PROJECT_SCHEMA_VERSION),
    id: z.string().min(1),
    title: z.string().min(1).max(80),
    status: courseProjectStatusSchema,
    wizardStep: z.number().int().min(1).max(5),
    courseBrief: draftValuesSchema,
    coursePlan: coursePlanSchema.nullable(),
    generation: courseProjectGenerationSchema.nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((project, context) => {
    if (project.status === "draft") return;

    if (!courseBriefSchema.safeParse(project.courseBrief).success) {
      context.addIssue({
        code: "custom",
        path: ["courseBrief"],
        message: "正式课程项目必须包含完整课程需求",
      });
    }
    if (!project.coursePlan) {
      context.addIssue({
        code: "custom",
        path: ["coursePlan"],
        message: "正式课程项目必须包含课程蓝图",
      });
    }
    if (!project.generation) {
      context.addIssue({
        code: "custom",
        path: ["generation"],
        message: "正式课程项目必须包含生成元数据",
      });
    }
  });

export const courseProjectStoreSchema = z.object({
  schemaVersion: z.literal(COURSE_PROJECT_SCHEMA_VERSION),
  projects: z.array(z.unknown()),
});

export type CourseProjectStatus = z.infer<typeof courseProjectStatusSchema>;
export type CourseProjectGeneration = z.infer<typeof courseProjectGenerationSchema>;
export type CourseProject = z.infer<typeof courseProjectSchema>;
