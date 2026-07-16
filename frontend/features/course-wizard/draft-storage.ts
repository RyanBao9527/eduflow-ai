import { z } from "zod";

import {
  requestedResourceSchema,
  type CourseBriefFormValues,
} from "@/features/course-wizard/course-brief-schema";

export const COURSE_WIZARD_DRAFT_KEY = "eduflow.course-wizard.draft.v1";
export const COURSE_WIZARD_DRAFT_VERSION = 1 as const;
export const COURSE_WIZARD_SAVE_DELAY_MS = 500;

const draftValuesSchema = z
  .object({
    courseTitle: z.string().optional(),
    subject: z.string().optional(),
    topic: z.string().optional(),
    description: z.string().optional(),
    teachingScenario: z
      .enum(["offline", "live", "recorded", "corporate", "self_study"])
      .optional(),
    targetLearners: z.string().optional(),
    ageOrGrade: z.string().optional(),
    learnerLevel: z.string().optional(),
    classSize: z.number().optional(),
    lessonDurationMinutes: z.number().optional(),
    lessonCount: z.number().optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    teachingStyles: z.array(z.string()).optional(),
    overallGoal: z.string().optional(),
    requestedResources: z.array(requestedResourceSchema).optional(),
    extraRequirements: z.string().optional(),
  })
  .strict();

export const courseWizardDraftSchema = z.object({
  version: z.literal(COURSE_WIZARD_DRAFT_VERSION),
  currentStep: z.number().int().min(1).max(5),
  values: draftValuesSchema,
  status: z.enum(["draft", "submitted"]),
  updatedAt: z.string().min(1),
});

export type CourseWizardDraft = z.infer<typeof courseWizardDraftSchema>;

export function createEmptyCourseWizardDraft(): CourseWizardDraft {
  return {
    version: COURSE_WIZARD_DRAFT_VERSION,
    currentStep: 1,
    values: {},
    status: "draft",
    updatedAt: new Date(0).toISOString(),
  };
}

export function loadCourseWizardDraft(storage: Storage): CourseWizardDraft {
  try {
    const rawDraft = storage.getItem(COURSE_WIZARD_DRAFT_KEY);
    if (!rawDraft) return createEmptyCourseWizardDraft();

    const parsedDraft = courseWizardDraftSchema.safeParse(JSON.parse(rawDraft));
    if (!parsedDraft.success) {
      storage.removeItem(COURSE_WIZARD_DRAFT_KEY);
      return createEmptyCourseWizardDraft();
    }

    return parsedDraft.data;
  } catch {
    try {
      storage.removeItem(COURSE_WIZARD_DRAFT_KEY);
    } catch {
      // Storage can be unavailable in privacy modes. The form remains usable in memory.
    }
    return createEmptyCourseWizardDraft();
  }
}

export function saveCourseWizardDraft(
  storage: Storage,
  draft: Omit<CourseWizardDraft, "version" | "updatedAt"> & {
    values: Partial<CourseBriefFormValues>;
  },
): CourseWizardDraft {
  const safeValues = Object.fromEntries(
    Object.entries(draft.values).filter(([, value]) => value !== undefined),
  );
  const parsedDraft = courseWizardDraftSchema.parse({
    ...draft,
    version: COURSE_WIZARD_DRAFT_VERSION,
    values: safeValues,
    updatedAt: new Date().toISOString(),
  });

  storage.setItem(COURSE_WIZARD_DRAFT_KEY, JSON.stringify(parsedDraft));
  return parsedDraft;
}

export function clearCourseWizardDraft(storage: Storage) {
  storage.removeItem(COURSE_WIZARD_DRAFT_KEY);
}

export function hasMeaningfulDraftValues(values: Partial<CourseBriefFormValues>) {
  return Object.values(values).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.trim().length > 0;
    return value !== undefined && value !== null;
  });
}
