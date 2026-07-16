import { beforeEach, describe, expect, it } from "vitest";

import {
  clearCourseWizardDraft,
  COURSE_WIZARD_DRAFT_KEY,
  createEmptyCourseWizardDraft,
  loadCourseWizardDraft,
  saveCourseWizardDraft,
} from "@/features/course-wizard/draft-storage";

describe("course wizard draft storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("saves and restores partial values with the current step", () => {
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 3,
      values: { courseTitle: "浮力", subject: "初中物理" },
      status: "draft",
    });

    const restored = loadCourseWizardDraft(window.localStorage);
    expect(restored.currentStep).toBe(3);
    expect(restored.values.courseTitle).toBe("浮力");
    expect(restored.version).toBe(1);
  });

  it("falls back safely and removes corrupted JSON", () => {
    window.localStorage.setItem(COURSE_WIZARD_DRAFT_KEY, "not-json");

    expect(loadCourseWizardDraft(window.localStorage)).toEqual(createEmptyCourseWizardDraft());
    expect(window.localStorage.getItem(COURSE_WIZARD_DRAFT_KEY)).toBeNull();
  });

  it("rejects an old draft version and can clear the current draft", () => {
    window.localStorage.setItem(
      COURSE_WIZARD_DRAFT_KEY,
      JSON.stringify({
        version: 0,
        currentStep: 4,
        values: { courseTitle: "旧草稿" },
        status: "draft",
        updatedAt: new Date().toISOString(),
      }),
    );

    expect(loadCourseWizardDraft(window.localStorage).currentStep).toBe(1);
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 1,
      values: { courseTitle: "新草稿" },
      status: "draft",
    });
    clearCourseWizardDraft(window.localStorage);
    expect(window.localStorage.getItem(COURSE_WIZARD_DRAFT_KEY)).toBeNull();
  });
});
