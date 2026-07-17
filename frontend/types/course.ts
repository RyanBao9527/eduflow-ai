export type CourseStatus = "draft" | "generated" | "editing";

export interface CourseSummary {
  id: string;
  title: string;
  subject: string;
  audience: string;
  lessonCount: number | null;
  status: CourseStatus;
  updatedAt: string;
  accent: "blue" | "teal" | "amber";
  href: string;
  actionLabel: string;
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

export type {
  CourseProject,
  CourseProjectGeneration,
  CourseProjectStatus,
} from "@/features/course-workspace/course-project-schema";
