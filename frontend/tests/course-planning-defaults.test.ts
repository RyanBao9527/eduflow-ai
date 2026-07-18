import { describe, expect, it } from "vitest";

import {
  getPlanningDefaultPatch,
  inferDifficulty,
} from "@/features/course-wizard/course-planning-defaults";

describe("course planning defaults", () => {
  it("fills every empty planning field from local rules", () => {
    expect(getPlanningDefaultPatch({
      courseTitle: "Python 少儿编程",
      topic: "Python 基础语法",
      learnerLevel: "零基础",
    })).toEqual({
      lessonCount: 8,
      lessonDurationMinutes: 45,
      teachingScenario: "offline",
      difficulty: "beginner",
      teachingStyles: ["AI智能规划"],
      overallGoal: "掌握Python 基础语法的核心知识，并能在实际任务中完成基础应用。",
    });
  });

  it("infers difficulty from learner level", () => {
    expect(inferDifficulty("零基础")).toBe("beginner");
    expect(inferDifficulty("入门")).toBe("intermediate");
    expect(inferDifficulty("有相关学习经验")).toBe("intermediate");
    expect(inferDifficulty("有项目实践经验")).toBe("advanced");
    expect(inferDifficulty("进阶")).toBe("advanced");
  });

  it("does not overwrite any existing planning value", () => {
    expect(getPlanningDefaultPatch({
      topic: "Python",
      learnerLevel: "零基础",
      lessonCount: 20,
      lessonDurationMinutes: 60,
      teachingScenario: "live",
      difficulty: "advanced",
      teachingStyles: ["互动式", "项目制"],
      overallGoal: "这是用户已经填写的课程目标",
    })).toEqual({});
  });
});
