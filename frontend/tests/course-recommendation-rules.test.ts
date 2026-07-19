import { describe, expect, it } from "vitest";

import {
  getCourseRecommendations,
  getCourseTitleSuggestions,
  getDefaultCourseDescription,
  getSubjectRecommendation,
} from "@/features/course-wizard/course-recommendation-rules";

describe("course recommendation rules", () => {
  it("returns three programming recommendations for Python", () => {
    const recommendations = getCourseRecommendations({ topic: "  PYTHON  " });

    expect(recommendations).toHaveLength(3);
    expect(recommendations.map((item) => item.title)).toEqual([
      "Python 少儿编程入门",
      "Python 数据分析入门",
      "Python 自动化办公",
    ]);
  });

  it("uses the first meaningful field and returns no more than three suggestions", () => {
    const recommendations = getCourseRecommendations({
      courseTitle: "企业沟通",
      subject: "",
      topic: "",
    });

    expect(recommendations).toHaveLength(3);
    expect(recommendations[0]).toMatchObject({
      title: "职场沟通与协作",
      subject: "企业培训",
    });
  });

  it("returns safe generic suggestions for an unmatched topic", () => {
    const recommendations = getCourseRecommendations({ topic: "摄影构图" });

    expect(recommendations).toHaveLength(3);
    expect(recommendations[0]).toMatchObject({
      title: "摄影构图入门",
      subject: "综合课程",
    });
  });

  it("does not recommend before the user provides two characters", () => {
    expect(getCourseRecommendations({ topic: "P" })).toEqual([]);
  });

  it("returns local course title templates without requiring a network request", () => {
    expect(getCourseTitleSuggestions("Python编程").map((item) => item.title)).toEqual([
      "Python 少儿编程入门",
      "Python 数据分析入门",
      "Python 自动化办公",
    ]);
    expect(getCourseTitleSuggestions("摄影构图").map((item) => item.title)).toEqual([
      "摄影构图入门",
      "摄影构图实践课",
      "摄影构图训练营",
    ]);
  });

  it("derives a subject and optional description from topic using local rules", () => {
    expect(getSubjectRecommendation("Python编程")).toBe("编程教育");
    expect(getSubjectRecommendation("摄影构图")).toBeUndefined();
    expect(getSubjectRecommendation("摄影构图", true)).toBe("综合课程");
    expect(getDefaultCourseDescription("Python编程")).toContain("Python编程");
    expect(getDefaultCourseDescription("")).toBe("");
  });
});
