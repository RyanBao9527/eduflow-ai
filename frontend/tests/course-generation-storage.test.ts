import { beforeEach, describe, expect, it } from "vitest";

import {
  clearCourseGeneration,
  COURSE_GENERATION_STORAGE_KEY,
  loadCourseGeneration,
  saveCourseGeneration,
} from "@/features/course-generation/course-generation-storage";
import { makeCourseResponse, validCourseBrief } from "./course-generation-fixtures";

describe("course generation session storage", () => {
  beforeEach(() => clearCourseGeneration(window.sessionStorage));

  it("saves and restores a validated result", () => {
    expect(saveCourseGeneration(window.sessionStorage, validCourseBrief, makeCourseResponse())).toBe(true);
    expect(loadCourseGeneration(window.sessionStorage)).toMatchObject({
      version: 1,
      brief: { courseTitle: "Python 编程启蒙" },
      response: { requestId: "request-1" },
    });
  });

  it("removes corrupted storage safely", () => {
    window.sessionStorage.setItem(COURSE_GENERATION_STORAGE_KEY, "not-json");
    expect(loadCourseGeneration(window.sessionStorage)).toBeNull();
    expect(window.sessionStorage.getItem(COURSE_GENERATION_STORAGE_KEY)).toBeNull();
  });
});
