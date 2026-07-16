import type { FieldPath } from "react-hook-form";

import type { CourseBriefFormValues } from "@/features/course-wizard/course-brief-schema";

export const TEACHING_SCENARIOS = [
  { value: "offline", label: "线下授课" },
  { value: "live", label: "在线直播" },
  { value: "recorded", label: "录播课程" },
  { value: "corporate", label: "企业培训" },
  { value: "self_study", label: "自主学习" },
] as const;

export const DIFFICULTY_OPTIONS = [
  { value: "beginner", label: "初级" },
  { value: "intermediate", label: "中级" },
  { value: "advanced", label: "高级" },
] as const;

export const TEACHING_STYLE_OPTIONS = [
  "互动式",
  "生活案例式",
  "实验探究式",
  "项目制",
  "游戏化",
  "案例式",
  "实操式",
] as const;

export const RESOURCE_OPTIONS = [
  { value: "lesson_plan", label: "教师教案", description: "完整教学流程与课堂安排" },
  { value: "teacher_script", label: "教师讲稿", description: "可直接使用的授课表达参考" },
  { value: "student_handout", label: "学生讲义", description: "面向学员的课程学习材料" },
  { value: "slides", label: "PPT 课件", description: "结构化幻灯片与讲解要点" },
  { value: "worksheet", label: "课堂练习", description: "课堂活动与巩固练习" },
  { value: "assessment", label: "课程测验", description: "学生版与教师版测验" },
  { value: "course_plan", label: "Excel 课程计划表", description: "课时、目标与资源计划" },
] as const;

export const WIZARD_STEPS = [
  { number: 1, title: "基础信息", shortTitle: "课程" },
  { number: 2, title: "目标学员", shortTitle: "学员" },
  { number: 3, title: "课程规划与教学风格", shortTitle: "规划" },
  { number: 4, title: "资源选择", shortTitle: "资源" },
  { number: 5, title: "确认课程需求", shortTitle: "确认" },
] as const;

export const STEP_FIELDS: Record<number, FieldPath<CourseBriefFormValues>[]> = {
  1: ["courseTitle", "subject", "topic", "description", "teachingScenario"],
  2: ["targetLearners", "ageOrGrade", "learnerLevel", "classSize"],
  3: [
    "lessonDurationMinutes",
    "lessonCount",
    "difficulty",
    "teachingStyles",
    "overallGoal",
  ],
  4: ["requestedResources", "extraRequirements"],
  5: [],
};

export function getOptionLabel(
  options: readonly { value: string; label: string }[],
  value?: string,
) {
  return options.find((option) => option.value === value)?.label ?? "未填写";
}
