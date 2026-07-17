export type CourseStatus = "draft" | "submitted" | "generating" | "ready" | "error";

export interface CourseSummary {
  id: string;
  title: string;
  subject: string;
  audience: string;
  lessonCount: number | null;
  status: CourseStatus;
  updatedAt: string;
  accent: "blue" | "teal" | "amber";
}

export interface DashboardMetric {
  label: string;
  value: string;
  change: string;
  tone: "blue" | "green" | "violet" | "amber";
}

export interface ExportActivity {
  id: string;
  courseTitle: string;
  resourceType: string;
  exportedAt: string;
}

export type {
  CourseBrief,
  CourseBriefFormValues,
} from "@/features/course-wizard/course-brief-schema";

export type {
  CoursePlan,
  CoursePlanGenerateResponse,
  StoredCourseGeneration,
} from "@/features/course-generation/course-plan-schema";
