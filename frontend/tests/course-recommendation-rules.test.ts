import { describe, expect, it } from "vitest";

import { getCourseRecommendations } from "@/features/course-wizard/course-recommendation-rules";

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
});
