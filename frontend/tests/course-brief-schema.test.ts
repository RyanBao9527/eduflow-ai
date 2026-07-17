import { describe, expect, it } from "vitest";

import { courseBriefSchema } from "@/features/course-wizard/course-brief-schema";

const validBrief = {
  courseTitle: "分数的初步认识",
  subject: "小学数学",
  topic: "认识分数并解决生活问题",
  description: "",
  teachingScenario: "offline" as const,
  targetLearners: "小学三年级学生",
  ageOrGrade: "三年级",
  learnerLevel: "具备整数运算基础",
  classSize: 30,
  lessonDurationMinutes: 40,
  lessonCount: 2,
  difficulty: "beginner" as const,
  teachingStyles: ["互动式", "生活案例式", "互动式"],
  overallGoal: "帮助学生理解分数含义，并能在生活情境中辨认分数。",
  requestedResources: ["lesson_plan", "slides"] as const,
  extraRequirements: "",
};

describe("courseBriefSchema", () => {
  it("parses a complete course brief and normalizes optional text and duplicates", () => {
    const result = courseBriefSchema.parse(validBrief);

    expect(result.description).toBeUndefined();
    expect(result.extraRequirements).toBeUndefined();
    expect(result.teachingStyles).toEqual(["互动式", "生活案例式"]);
  });

  it("rejects missing current-step fields and invalid numeric ranges", () => {
    const result = courseBriefSchema.safeParse({
      ...validBrief,
      courseTitle: "",
      classSize: 0,
      lessonDurationMinutes: 5,
      requestedResources: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]);
      expect(paths).toContain("courseTitle");
      expect(paths).toContain("classSize");
      expect(paths).toContain("lessonDurationMinutes");
      expect(paths).toContain("requestedResources");
    }
  });

  it("accepts 50 lessons and rejects 51", () => {
    expect(courseBriefSchema.safeParse({ ...validBrief, lessonCount: 50 }).success).toBe(true);
    expect(courseBriefSchema.safeParse({ ...validBrief, lessonCount: 51 }).success).toBe(false);
  });
});
