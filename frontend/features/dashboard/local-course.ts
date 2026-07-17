import { loadCourseWizardDraft } from "@/features/course-wizard/draft-storage";
import { loadCourseGeneration } from "@/features/course-generation/course-generation-storage";
import type { CourseSummary } from "@/types/course";

export const LOCAL_COURSE_ID = "course-local-draft";

function formatUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return "刚刚更新";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getLocalCourseSummary(
  storage: Storage,
  generationStorage?: Storage,
): CourseSummary | null {
  const draft = loadCourseWizardDraft(storage);
  const title = draft.values.courseTitle?.trim();
  if (!title) return null;

  const generation = generationStorage ? loadCourseGeneration(generationStorage) : null;
  const hasReadyBlueprint = generation?.brief.courseTitle === title;

  return {
    id: LOCAL_COURSE_ID,
    title,
    subject: draft.values.subject?.trim() || "尚未设置学科",
    audience: draft.values.targetLearners?.trim() || "尚未设置目标学员",
    lessonCount: draft.values.lessonCount ?? null,
    status: hasReadyBlueprint
      ? "ready"
      : draft.status === "submitted"
        ? "submitted"
        : "draft",
    updatedAt: formatUpdatedAt(
      hasReadyBlueprint ? generation.response.generation.generatedAt : draft.updatedAt,
    ),
    accent: "blue",
  };
}
