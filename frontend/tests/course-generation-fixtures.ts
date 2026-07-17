import type { CourseBrief } from "@/features/course-wizard/course-brief-schema";
import type { CoursePlanGenerateResponse } from "@/features/course-generation/course-plan-schema";

export const validCourseBrief: CourseBrief = {
  courseTitle: "Python 编程启蒙",
  subject: "编程",
  topic: "循环结构",
  teachingScenario: "offline",
  targetLearners: "小学高年级学生",
  ageOrGrade: "五年级",
  learnerLevel: "零基础",
  lessonDurationMinutes: 45,
  lessonCount: 1,
  difficulty: "beginner",
  teachingStyles: ["互动式"],
  overallGoal: "理解循环并完成基础编程任务",
  requestedResources: ["lesson_plan"],
};

const commonPlan = {
  schemaVersion: "1.0" as const,
  title: "Python 编程启蒙",
  positioning: "面向零基础学习者的实践课程",
  overview: "通过连续任务建立编程基础。",
  assumptions: [],
  audienceAnalysis: {
    profile: "小学高年级零基础学生",
    prerequisites: ["基本电脑操作"],
    learningNeeds: ["即时反馈"],
  },
  learningObjectives: [
    { objectiveId: "OBJ01", statement: "识别重复任务", evidence: "完成识别练习" },
    { objectiveId: "OBJ02", statement: "理解循环", evidence: "解释循环用途" },
    { objectiveId: "OBJ03", statement: "应用循环", evidence: "完成编程任务" },
  ],
  modules: [
    {
      moduleId: "M01",
      title: "循环入门",
      goal: "理解循环结构",
      lessonIds: ["L001"],
      keyConcepts: ["重复"],
    },
  ],
  lessonIndex: [
    {
      lessonId: "L001",
      moduleId: "M01",
      lessonNumber: 1,
      title: "认识重复任务",
      objective: "识别生活中的重复行为",
      keyConcepts: ["重复"],
      durationMinutes: 45,
    },
  ],
  teachingStrategy: {
    approach: "任务驱动",
    learnerEngagement: "通过互动任务参与",
    differentiation: ["提供分层任务"],
  },
  assessmentPlan: {
    diagnostic: "课前提问",
    formative: "课堂观察",
    summative: "结课任务",
  },
  resourcePlan: [
    {
      resourceType: "lesson_plan" as const,
      purpose: "支持教师实施课程",
      moduleIds: ["M01"],
      lessonIds: [],
    },
  ],
  qualityChecklist: ["结构完整", "目标可评估", "课时无重复"],
};

export function makeCourseResponse(
  provider = "provider-from-api",
  model = "model-from-api",
): CoursePlanGenerateResponse {
  return {
    schemaVersion: "1.0",
    requestId: "request-1",
    status: "succeeded",
    coursePlan: {
      ...commonPlan,
      detailMode: "detailed",
      lessonDetails: [
        {
          lessonId: "L001",
          teachingActivities: ["观察重复任务"],
          assessmentMethod: "完成课堂任务",
        },
      ],
    },
    generation: {
      provider,
      model,
      detailMode: "detailed",
      promptVersion: "course-blueprint-v3",
      attempts: 1,
      generatedAt: "2026-07-17T10:00:00Z",
      usage: {
        promptTokens: 100,
        promptCacheHitTokens: 0,
        promptCacheMissTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        estimatedCostUsd: null,
        pricingSnapshot: null,
      },
    },
  };
}
