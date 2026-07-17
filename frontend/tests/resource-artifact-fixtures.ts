import type {
  LessonPlanContent,
  SlideOutlineContent,
} from "@/features/course-resources/resource-artifact-schema";

export const resourceGenerationMetadata = {
  requestId: "resource-request-1",
  provider: "provider-from-api",
  model: "model-from-api",
  promptVersion: "resource-generation-v1",
  attempts: 1,
  generatedAt: "2026-07-17T10:00:00.000Z",
  usage: {
    promptTokens: 100,
    promptCacheHitTokens: 0,
    promptCacheMissTokens: 100,
    completionTokens: 200,
    totalTokens: 300,
    estimatedCostUsd: 0.000123,
    pricingSnapshot: "2026-07-17",
  },
};

export function makeLessonPlanContent(summary = "通过生活案例认识循环结构。"): LessonPlanContent {
  return {
    summary,
    objectives: ["识别重复任务"],
    keyPoints: ["重复", "循环"],
    difficultPoints: ["将生活步骤转换为程序结构"],
    preparation: ["循环任务卡片"],
    stages: [
      {
        stageId: "ST01",
        title: "课堂活动",
        durationMinutes: 45,
        teacherActivities: ["展示重复任务案例"],
        learnerActivities: ["观察并描述重复行为"],
        assessment: "检查学员能否识别重复步骤",
      },
    ],
    assessment: "完成课堂循环识别任务",
    differentiation: ["为零基础学员提供步骤提示"],
    extension: "寻找更多生活中的循环案例",
    assumptions: [],
    qualityChecklist: ["目标与活动一致"],
  };
}

export function makeSlideOutlineContent(
  overview = "使用六页幻灯片介绍循环概念。",
): SlideOutlineContent {
  return {
    overview,
    slides: Array.from({ length: 6 }, (_, index) => ({
      slideId: `S${String(index + 1).padStart(2, "0")}`,
      title: `幻灯片 ${index + 1}`,
      purpose: "推进课堂讲解",
      keyPoints: ["循环概念"],
      visualSuggestion: "使用简单流程图",
      speakerNotes: "结合生活案例讲解",
    })),
    assumptions: [],
    qualityChecklist: ["每页目标清晰"],
  };
}
