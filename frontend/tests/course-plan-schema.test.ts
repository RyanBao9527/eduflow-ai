import { describe, expect, it } from "vitest";

import { coursePlanGenerateResponseSchema } from "@/features/course-generation/course-plan-schema";
import { makeCourseResponse } from "./course-generation-fixtures";

describe("course plan response schema", () => {
  it("keeps provider metadata supplied by the API", () => {
    const result = coursePlanGenerateResponseSchema.parse(
      makeCourseResponse("custom-provider", "custom-model"),
    );

    expect(result.generation.provider).toBe("custom-provider");
    expect(result.generation.model).toBe("custom-model");
    expect(result.coursePlan.detailMode).toBe("detailed");
  });

  it("accepts balanced plans without full lesson details", () => {
    const response = makeCourseResponse();
    const detailed = response.coursePlan;
    if (detailed.detailMode !== "detailed") throw new Error("fixture must be detailed");
    const common = Object.fromEntries(
      Object.entries(detailed).filter(([key]) => key !== "lessonDetails"),
    );
    const balanced = {
      ...response,
      coursePlan: {
        ...common,
        detailMode: "balanced",
        phases: [
          { phaseId: "P01", title: "阶段一", goal: "建立基础", moduleIds: ["M01"], lessonIds: ["L001"], milestone: "完成基础任务" },
        ],
        keyLessonDetails: detailed.lessonDetails,
      },
      generation: { ...response.generation, detailMode: "balanced" },
    };

    expect(coursePlanGenerateResponseSchema.parse(balanced).coursePlan.detailMode).toBe("balanced");
    expect("lessonDetails" in balanced.coursePlan).toBe(false);
  });
});
