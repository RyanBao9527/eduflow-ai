import type { CourseBriefFormValues } from "@/features/course-wizard/course-brief-schema";

export type PlanningDefaultPatch = Partial<
  Pick<
    CourseBriefFormValues,
    | "lessonCount"
    | "lessonDurationMinutes"
    | "teachingScenario"
    | "difficulty"
    | "teachingStyles"
    | "overallGoal"
  >
>;

export function inferDifficulty(
  learnerLevel?: string,
): NonNullable<CourseBriefFormValues["difficulty"]> {
  const normalized = learnerLevel?.trim().toLocaleLowerCase() ?? "";
  if (/(进阶|高级|熟练|项目实践)/.test(normalized)) return "advanced";
  if (/(入门|有基础|学习经验|已掌握|基础知识)/.test(normalized)) return "intermediate";
  return "beginner";
}

export function buildDefaultOverallGoal(values: Partial<CourseBriefFormValues>) {
  const focus = values.topic?.trim() || values.courseTitle?.trim() || "课程主题";
  return `掌握${focus}的核心知识，并能在实际任务中完成基础应用。`;
}

export function getPlanningDefaultPatch(
  values: Partial<CourseBriefFormValues>,
): PlanningDefaultPatch {
  const patch: PlanningDefaultPatch = {};

  if (values.lessonCount === undefined) patch.lessonCount = 8;
  if (values.lessonDurationMinutes === undefined) patch.lessonDurationMinutes = 45;
  if (!values.teachingScenario) patch.teachingScenario = "offline";
  if (!values.difficulty) patch.difficulty = inferDifficulty(values.learnerLevel);
  if (!values.teachingStyles?.length) patch.teachingStyles = ["AI智能规划"];
  if (!values.overallGoal?.trim()) patch.overallGoal = buildDefaultOverallGoal(values);

  return patch;
}
