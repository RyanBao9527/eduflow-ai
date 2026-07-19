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

export const TEACHING_MODE_OPTIONS = [
  { value: "AI智能规划", label: "AI智能规划（推荐）" },
  { value: "项目制", label: "项目制教学" },
  { value: "游戏化", label: "游戏化教学" },
  { value: "理论讲解", label: "理论讲解" },
  { value: "考试训练", label: "考试训练" },
  { value: "企业培训", label: "企业培训" },
] as const;

export const LEARNER_TYPE_OPTIONS = [
  { value: "K12学生", label: "K12学生" },
  { value: "大学生", label: "大学生" },
  { value: "教师", label: "教师" },
  { value: "企业员工", label: "企业员工" },
  { value: "职场人士", label: "职场人士" },
] as const;

export const EDUCATION_STAGE_OPTIONS = [
  { value: "小学", label: "小学" },
  { value: "初中", label: "初中" },
  { value: "高中", label: "高中" },
  { value: "大学", label: "大学" },
  { value: "成人", label: "成人" },
] as const;

export const ADULT_EDUCATION_STAGE_OPTIONS = [
  { value: "成人", label: "成人（默认）" },
] as const;

export const LEARNER_LEVEL_OPTIONS = [
  { value: "零基础", label: "零基础" },
  { value: "入门", label: "入门" },
  { value: "进阶", label: "进阶" },
] as const;

export const RESOURCE_OPTIONS = [
  { value: "lesson_plan", label: "教师教案", description: "完整教学流程与课堂安排" },
  { value: "teacher_script", label: "教师讲稿", description: "授课表达参考与课堂讲解辅助" },
  { value: "student_handout", label: "学生讲义", description: "面向学员的学习材料" },
  { value: "slides", label: "PPT课件", description: "结构化幻灯片与课堂讲解要点" },
  { value: "worksheet", label: "课堂练习", description: "课堂活动与巩固练习" },
  { value: "assessment", label: "课程测验", description: "学生版与教师版测验" },
  { value: "course_plan", label: "Excel课程规划表", description: "课时、目标与资源规划" },
] as const;

export const ADVANCED_RESOURCE_OPTIONS = [
  { value: "slides", label: "PPT课件", description: "用于课堂讲解的结构化课件规划" },
  { value: "lesson_plan", label: "教师教案", description: "完整教学流程与课堂安排规划" },
  { value: "worksheet", label: "学生练习与作业", description: "课堂巩固练习与课后任务规划" },
] as const;

export const MORE_RESOURCE_OPTIONS = [
  { value: "teacher_script", label: "教师讲稿", description: "授课表达参考与课堂讲解辅助" },
  { value: "student_handout", label: "学生讲义", description: "面向学员的学习材料" },
  { value: "assessment", label: "课程测验", description: "学生版与教师版测验" },
] as const;

export const WIZARD_STEPS = [
  { number: 1, title: "创建课程基础信息", shortTitle: "想法" },
  { number: 2, title: "学员画像", shortTitle: "学员" },
  { number: 3, title: "AI 规划", shortTitle: "规划" },
  { number: 4, title: "资源方案", shortTitle: "资源" },
  { number: 5, title: "确认创建", shortTitle: "确认" },
] as const;

export const STEP_FIELDS: Record<number, FieldPath<CourseBriefFormValues>[]> = {
  1: ["topic", "teachingScenario"],
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
