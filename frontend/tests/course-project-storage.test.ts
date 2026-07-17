import { beforeEach, describe, expect, it, vi } from "vitest";

import { saveCourseGeneration } from "@/features/course-generation/course-generation-storage";
import { saveCourseWizardDraft } from "@/features/course-wizard/draft-storage";
import { migrateLegacyCourseProject } from "@/features/course-workspace/course-project-migration";
import {
  attachGenerationToProject,
  COURSE_PROJECT_STORAGE_KEY,
  CourseProjectStorageError,
  createDraftCourseProject,
  finalizeCourseProject,
  getCourseProject,
  listCourseProjects,
  saveEditedCourseProject,
  updateDraftCourseProject,
} from "@/features/course-workspace/course-project-storage";
import { makeCourseResponse, validCourseBrief } from "./course-generation-fixtures";

describe("CourseProject storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("creates and updates one versioned draft without duplication", () => {
    const created = createDraftCourseProject(window.localStorage, {
      courseTitle: "本地课程项目",
    });
    const updated = updateDraftCourseProject(
      window.localStorage,
      created.id,
      { courseTitle: "更新后的课程项目", lessonCount: 51 },
      3,
    );

    expect(updated).toMatchObject({
      schemaVersion: "1.0",
      id: created.id,
      status: "draft",
      title: "更新后的课程项目",
      wizardStep: 3,
      courseBrief: { lessonCount: 51 },
    });
    expect(listCourseProjects(window.localStorage)).toHaveLength(1);
  });

  it("moves a generated project to editing while preserving structure IDs", () => {
    const draft = createDraftCourseProject(window.localStorage, validCourseBrief);
    attachGenerationToProject(
      window.localStorage,
      draft.id,
      validCourseBrief,
      makeCourseResponse(),
    );
    const generated = finalizeCourseProject(window.localStorage, draft.id);
    const moduleIds = generated.coursePlan?.modules.map((module) => module.moduleId);
    const lessonIds = generated.coursePlan?.lessonIndex.map((lesson) => lesson.lessonId);

    const edited = saveEditedCourseProject(window.localStorage, {
      ...generated,
      title: "人工编辑课程",
      coursePlan: generated.coursePlan
        ? {
            ...generated.coursePlan,
            modules: generated.coursePlan.modules.map((module) => ({
              ...module,
              title: "人工编辑模块",
            })),
          }
        : null,
    });

    expect(edited.status).toBe("editing");
    expect(edited.courseBrief.courseTitle).toBe("人工编辑课程");
    expect(edited.coursePlan?.title).toBe("人工编辑课程");
    expect(edited.coursePlan?.modules.map((module) => module.moduleId)).toEqual(moduleIds);
    expect(edited.coursePlan?.lessonIndex.map((lesson) => lesson.lessonId)).toEqual(lessonIds);
  });

  it("filters an invalid project without hiding other valid projects", () => {
    const valid = createDraftCourseProject(window.localStorage, { courseTitle: "有效项目" });
    const envelope = JSON.parse(window.localStorage.getItem(COURSE_PROJECT_STORAGE_KEY)!);
    envelope.projects.push({ id: "broken-project" });
    window.localStorage.setItem(COURSE_PROJECT_STORAGE_KEY, JSON.stringify(envelope));

    expect(listCourseProjects(window.localStorage).map((project) => project.id)).toEqual([
      valid.id,
    ]);
  });

  it("keeps the previous stored project when a later write fails", () => {
    const created = createDraftCourseProject(window.localStorage, { courseTitle: "保留的项目" });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    expect(() =>
      updateDraftCourseProject(
        window.localStorage,
        created.id,
        { courseTitle: "无法写入的修改" },
      ),
    ).toThrow(CourseProjectStorageError);
    setItem.mockRestore();
    expect(getCourseProject(window.localStorage, created.id)?.title).toBe("保留的项目");
  });

  it("returns safe defaults when localStorage reads are unavailable", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("storage blocked", "SecurityError");
    });

    expect(() => listCourseProjects(window.localStorage)).not.toThrow();
    expect(listCourseProjects(window.localStorage)).toEqual([]);
    expect(() => getCourseProject(window.localStorage, "missing-project")).not.toThrow();
    expect(getCourseProject(window.localStorage, "missing-project")).toBeNull();
    getItem.mockRestore();
  });

  it("migrates a legacy draft and matching session blueprint once", () => {
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 5,
      values: validCourseBrief,
      status: "submitted",
    });
    saveCourseGeneration(window.sessionStorage, validCourseBrief, makeCourseResponse());

    const migrated = migrateLegacyCourseProject(
      window.localStorage,
      window.sessionStorage,
    );

    expect(migrated).toMatchObject({
      schemaVersion: "1.0",
      status: "draft",
      title: validCourseBrief.courseTitle,
    });
    expect(migrated?.coursePlan).not.toBeNull();
    expect(listCourseProjects(window.localStorage)).toHaveLength(1);
    expect(window.sessionStorage).toHaveLength(0);
  });

  it("preserves a session blueprint when its title does not match the legacy draft", () => {
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 2,
      values: { courseTitle: "旧草稿课程" },
      status: "draft",
    });
    const sessionBrief = { ...validCourseBrief, courseTitle: "另一个课程蓝图" };
    const sessionResponse = makeCourseResponse();
    sessionResponse.coursePlan.title = sessionBrief.courseTitle;
    saveCourseGeneration(window.sessionStorage, sessionBrief, sessionResponse);

    const migrated = migrateLegacyCourseProject(
      window.localStorage,
      window.sessionStorage,
    );

    expect(migrated?.title).toBe("旧草稿课程");
    expect(migrated?.coursePlan).toBeNull();
    expect(window.sessionStorage).not.toHaveLength(0);
  });
});
