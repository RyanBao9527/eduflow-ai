import { beforeEach, describe, expect, it } from "vitest";

import {
  getLocalCourseSummary,
  LOCAL_COURSE_ID,
} from "@/features/dashboard/local-course";
import { clearCourseWizardDraft, saveCourseWizardDraft } from "@/features/course-wizard/draft-storage";

describe("getLocalCourseSummary", () => {
  beforeEach(() => {
    clearCourseWizardDraft(window.localStorage);
  });

  it("returns no course when the local draft has no title", () => {
    expect(getLocalCourseSummary(window.localStorage)).toBeNull();
  });

  it("maps a partial draft to a resumable course card", () => {
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 2,
      values: {
        courseTitle: "企业沟通基础",
        subject: "企业培训",
        targetLearners: "新任管理者",
      },
      status: "draft",
    });

    expect(getLocalCourseSummary(window.localStorage)).toMatchObject({
      id: LOCAL_COURSE_ID,
      title: "企业沟通基础",
      subject: "企业培训",
      audience: "新任管理者",
      lessonCount: null,
      status: "draft",
    });
  });

  it("marks a submitted course separately from a draft", () => {
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 5,
      values: { courseTitle: "分数的初步认识" },
      status: "submitted",
    });

    expect(getLocalCourseSummary(window.localStorage)).toMatchObject({
      status: "submitted",
      subject: "尚未设置学科",
      audience: "尚未设置目标学员",
    });
  });
});
