import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resourceArtifactSchema,
  type CreateResourceArtifactInput,
  type LessonPlanContent,
  type SlideOutlineContent,
} from "@/features/course-resources/resource-artifact-schema";
import {
  createResourceArtifactVersion,
  getReadyResourceArtifact,
  getResourceArtifact,
  listResourceArtifacts,
  listResourceArtifactVersions,
  MAX_RESOURCE_ARTIFACT_VERSIONS,
  RESOURCE_ARTIFACT_STORAGE_KEY,
  ResourceArtifactStorageError,
} from "@/features/course-resources/resource-artifact-storage";
import {
  COURSE_PROJECT_STORAGE_KEY,
  createDraftCourseProject,
} from "@/features/course-workspace/course-project-storage";

const generation = {
  requestId: "resource-request-1",
  provider: "provider-from-api",
  model: "model-from-api",
  promptVersion: "lesson-plan-v1",
  attempts: 1,
  generatedAt: "2026-07-17T10:00:00.000Z",
  usage: {
    promptTokens: 100,
    promptCacheHitTokens: 0,
    promptCacheMissTokens: 100,
    completionTokens: 200,
    totalTokens: 300,
    estimatedCostUsd: null,
    pricingSnapshot: null,
  },
};

const lessonPlanContent: LessonPlanContent = {
  summary: "通过生活案例认识循环结构。",
  objectives: ["识别重复任务"],
  keyPoints: ["重复", "循环"],
  difficultPoints: ["将生活步骤转换为程序结构"],
  preparation: ["循环任务卡片"],
  stages: [
    {
      stageId: "ST01",
      title: "导入",
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

const slideOutlineContent: SlideOutlineContent = {
  overview: "使用六页幻灯片介绍循环概念。",
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

function lessonPlanInput(title = "认识重复任务教师教案"): CreateResourceArtifactInput {
  return {
    courseProjectId: "project-1",
    moduleId: "M01",
    lessonId: "L001",
    resourceType: "lesson_plan",
    title,
    sourceProjectUpdatedAt: "2026-07-17T09:00:00.000Z",
    generation,
    content: lessonPlanContent,
  };
}

describe("ResourceArtifact storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates a ready v1 artifact with schemaVersion and a UUID resourceId", () => {
    const artifact = createResourceArtifactVersion(window.localStorage, lessonPlanInput());

    expect(artifact).toMatchObject({
      schemaVersion: "1.0",
      courseProjectId: "project-1",
      resourceType: "lesson_plan",
      status: "ready",
      version: 1,
      replacesResourceId: null,
    });
    expect(artifact.resourceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(resourceArtifactSchema.parse(artifact)).toEqual(artifact);
  });

  it("keeps ResourceArtifacts separate from CourseProject storage", () => {
    const project = createDraftCourseProject(window.localStorage, { courseTitle: "独立存储课程" });
    createResourceArtifactVersion(window.localStorage, {
      ...lessonPlanInput(),
      courseProjectId: project.id,
    });

    const projectsRaw = window.localStorage.getItem(COURSE_PROJECT_STORAGE_KEY);
    const artifactsRaw = window.localStorage.getItem(RESOURCE_ARTIFACT_STORAGE_KEY);

    expect(projectsRaw).not.toContain("lesson_plan");
    expect(artifactsRaw).toContain(project.id);
    expect(Object.keys(window.localStorage)).toEqual(
      expect.arrayContaining([COURSE_PROJECT_STORAGE_KEY, RESOURCE_ARTIFACT_STORAGE_KEY]),
    );
  });

  it("creates immutable new versions and supersedes the previous ready version", () => {
    const first = createResourceArtifactVersion(window.localStorage, lessonPlanInput("教案 v1"));
    const second = createResourceArtifactVersion(window.localStorage, lessonPlanInput("教案 v2"));
    const versions = listResourceArtifactVersions(window.localStorage, {
      courseProjectId: "project-1",
      lessonId: "L001",
      resourceType: "lesson_plan",
    });

    expect(second).toMatchObject({
      version: 2,
      status: "ready",
      replacesResourceId: first.resourceId,
      title: "教案 v2",
    });
    expect(versions).toHaveLength(2);
    expect(versions[0].status).toBe("ready");
    expect(versions[1]).toMatchObject({
      resourceId: first.resourceId,
      status: "superseded",
      title: "教案 v1",
      content: first.content,
    });
    expect(getReadyResourceArtifact(window.localStorage, {
      courseProjectId: "project-1",
      lessonId: "L001",
      resourceType: "lesson_plan",
    })?.resourceId).toBe(second.resourceId);
  });

  it("keeps independent version sequences for the two fixed resource types", () => {
    createResourceArtifactVersion(window.localStorage, lessonPlanInput());
    const slideOutline = createResourceArtifactVersion(window.localStorage, {
      courseProjectId: "project-1",
      moduleId: "M01",
      lessonId: "L001",
      resourceType: "slide_outline",
      title: "认识重复任务 PPT课件内容结构",
      sourceProjectUpdatedAt: "2026-07-17T09:00:00.000Z",
      generation: { ...generation, promptVersion: "slide-outline-v1" },
      content: slideOutlineContent,
    });

    expect(slideOutline.version).toBe(1);
    expect(listResourceArtifacts(window.localStorage, "project-1")).toHaveLength(2);
  });

  it("retains only the latest three successful versions per resource identity", () => {
    const created = Array.from({ length: MAX_RESOURCE_ARTIFACT_VERSIONS + 1 }, (_, index) =>
      createResourceArtifactVersion(window.localStorage, lessonPlanInput(`教案 v${index + 1}`)),
    );
    const versions = listResourceArtifactVersions(window.localStorage, {
      courseProjectId: "project-1",
      lessonId: "L001",
      resourceType: "lesson_plan",
    });

    expect(versions.map((artifact) => artifact.version)).toEqual([4, 3, 2]);
    expect(versions.map((artifact) => artifact.status)).toEqual([
      "ready",
      "superseded",
      "superseded",
    ]);
    expect(versions[0].replacesResourceId).toBe(versions[1].resourceId);
    expect(versions[1].replacesResourceId).toBe(versions[2].resourceId);
    expect(versions.filter((artifact) => artifact.status === "ready")).toHaveLength(1);
    expect(getResourceArtifact(window.localStorage, created[0].resourceId)).toBeNull();
  });

  it("preserves the previous ready version when a later storage write fails", () => {
    const first = createResourceArtifactVersion(window.localStorage, lessonPlanInput("可用教案"));
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    expect(() =>
      createResourceArtifactVersion(window.localStorage, lessonPlanInput("无法保存的教案")),
    ).toThrow(ResourceArtifactStorageError);
    setItem.mockRestore();

    expect(getReadyResourceArtifact(window.localStorage, {
      courseProjectId: "project-1",
      lessonId: "L001",
      resourceType: "lesson_plan",
    })?.resourceId).toBe(first.resourceId);
    expect(listResourceArtifacts(window.localStorage)).toHaveLength(1);
  });

  it("returns safe defaults when localStorage reads are unavailable", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("storage blocked", "SecurityError");
    });

    expect(() => listResourceArtifacts(window.localStorage)).not.toThrow();
    expect(listResourceArtifacts(window.localStorage)).toEqual([]);
    expect(getResourceArtifact(window.localStorage, "missing-resource")).toBeNull();
    getItem.mockRestore();
  });

  it("filters a corrupted artifact without hiding valid resources", () => {
    const valid = createResourceArtifactVersion(window.localStorage, lessonPlanInput());
    const envelope = JSON.parse(
      window.localStorage.getItem(RESOURCE_ARTIFACT_STORAGE_KEY)!,
    );
    envelope.artifacts.push({ resourceId: "broken-resource", resourceType: "teacher_script" });
    window.localStorage.setItem(RESOURCE_ARTIFACT_STORAGE_KEY, JSON.stringify(envelope));

    expect(listResourceArtifacts(window.localStorage).map((artifact) => artifact.resourceId)).toEqual([
      valid.resourceId,
    ]);
  });
});
