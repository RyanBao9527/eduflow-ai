import { describe, expect, it, vi } from "vitest";

import {
  createResourceArtifactVersion,
  listResourceArtifactVersions,
} from "@/features/course-resources/resource-artifact-storage";
import {
  downloadBlob,
  getResourceExportFileName,
  resourceArtifactToMarkdown,
} from "@/features/course-export/export-utils";
import { createResourceExportFile } from "@/features/course-export/export-service";
import {
  RESOURCE_EXPORT_MIME_TYPES,
  type PptxExportContext,
} from "@/features/course-export/export-types";
import {
  makeLessonPlanContent,
  makeSlideOutlineContent,
  resourceGenerationMetadata,
} from "./resource-artifact-fixtures";

function createLessonPlan(title = "L001 教师教案", summary?: string) {
  return createResourceArtifactVersion(window.localStorage, {
    courseProjectId: "project-export",
    moduleId: "M01",
    lessonId: "L001",
    resourceType: "lesson_plan",
    title,
    sourceProjectUpdatedAt: "2026-07-17T09:00:00.000Z",
    generation: resourceGenerationMetadata,
    content: makeLessonPlanContent(summary),
  });
}

function createSlideOutline() {
  return createResourceArtifactVersion(window.localStorage, {
    courseProjectId: "project-export",
    moduleId: "M01",
    lessonId: "L001",
    resourceType: "slide_outline",
    title: "L001 PPT课件结构",
    sourceProjectUpdatedAt: "2026-07-17T09:00:00.000Z",
    generation: resourceGenerationMetadata,
    content: makeSlideOutlineContent(),
  });
}

const pptxContext: PptxExportContext = {
  courseTitle: "Python 编程启蒙",
  lessonTitle: "认识重复任务",
  lessonNumber: 1,
};

describe("course resource export", () => {
  it("serializes a lesson plan to complete Markdown", () => {
    const markdown = resourceArtifactToMarkdown(createLessonPlan());

    expect(markdown).toContain("# L001 教师教案");
    expect(markdown).toContain("## 教学目标");
    expect(markdown).toContain("## 核心知识点");
    expect(markdown).toContain("## 教学流程");
    expect(markdown).toContain("### ST01 · 课堂活动（45 分钟）");
    expect(markdown).toContain("展示重复任务案例");
    expect(markdown).toContain("## 评估方案");
  });

  it("serializes a slide outline to Markdown without creating PPTX content", () => {
    const markdown = resourceArtifactToMarkdown(createSlideOutline());

    expect(markdown).toContain("# L001 PPT课件结构");
    expect(markdown).toContain("## 幻灯片内容结构");
    expect(markdown).toContain("### S01 · 幻灯片 1");
    expect(markdown).toContain("**视觉建议：** 使用简单流程图");
    expect(markdown).toContain("**讲解提示：** 结合生活案例讲解");
  });

  it("creates stable file names and correct Markdown MIME types", async () => {
    const lessonPlan = createLessonPlan();
    const slideOutline = createSlideOutline();
    const lessonFile = await createResourceExportFile(lessonPlan, "markdown");

    expect(getResourceExportFileName(lessonPlan, "markdown")).toBe(
      "eduflow-L001-lesson-plan-v1.md",
    );
    expect(getResourceExportFileName(slideOutline, "markdown")).toBe(
      "eduflow-L001-slide-outline-v1.md",
    );
    expect(lessonFile.mimeType).toBe(RESOURCE_EXPORT_MIME_TYPES.markdown);
    expect(lessonFile.blob.type).toBe(RESOURCE_EXPORT_MIME_TYPES.markdown);
  });

  it("generates a real DOCX Blob for a lesson plan", async () => {
    const file = await createResourceExportFile(createLessonPlan(), "docx");

    expect(file.fileName).toBe("eduflow-L001-lesson-plan-v1.docx");
    expect(file.mimeType).toBe(RESOURCE_EXPORT_MIME_TYPES.docx);
    expect(file.blob.type).toBe(RESOURCE_EXPORT_MIME_TYPES.docx);
    expect(file.blob.size).toBeGreaterThan(100);
  });

  it("generates a real PPTX Blob for a slide outline", async () => {
    const file = await createResourceExportFile(
      createSlideOutline(),
      "pptx",
      pptxContext,
    );
    const bytes = new Uint8Array(await file.blob.arrayBuffer());

    expect(file.fileName).toBe("eduflow-L001-slides-v1.pptx");
    expect(file.mimeType).toBe(RESOURCE_EXPORT_MIME_TYPES.pptx);
    expect(file.blob.type).toBe(RESOURCE_EXPORT_MIME_TYPES.pptx);
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
  });

  it("downloads through an object URL and always releases it", () => {
    const createObjectURL = vi.fn(() => "blob:course-export");
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const blob = new Blob(["# Course"], { type: RESOURCE_EXPORT_MIME_TYPES.markdown });

    downloadBlob(blob, "course.md");

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:course-export");
    expect(document.querySelector("a[download='course.md']")).not.toBeInTheDocument();
    click.mockRestore();
  });

  it("rejects empty, damaged, and unsupported resources", async () => {
    await expect(createResourceExportFile(null, "markdown")).rejects.toThrow(
      "当前课程资源已损坏或为空，无法导出。",
    );
    await expect(createResourceExportFile({ resourceType: "lesson_plan" }, "markdown"))
      .rejects.toThrow("当前课程资源已损坏或为空，无法导出。");
    await expect(createResourceExportFile(createSlideOutline(), "docx")).rejects.toThrow(
      "当前课程资源不支持所选导出格式。",
    );
    await expect(createResourceExportFile(createSlideOutline(), "pptx")).rejects.toThrow(
      "PPTX 导出缺少课程或课时信息。",
    );
  });

  it("exports a historical PPTX version without modifying Artifact state", async () => {
    createSlideOutline();
    createSlideOutline();
    const before = listResourceArtifactVersions(window.localStorage, {
      courseProjectId: "project-export",
      lessonId: "L001",
      resourceType: "slide_outline",
    });
    const historical = before.find((artifact) => artifact.version === 1)!;
    const snapshot = structuredClone(before);

    const file = await createResourceExportFile(historical, "pptx", pptxContext);

    expect(file.fileName).toBe("eduflow-L001-slides-v1.pptx");
    expect(listResourceArtifactVersions(window.localStorage, {
      courseProjectId: "project-export",
      lessonId: "L001",
      resourceType: "slide_outline",
    })).toEqual(snapshot);
  });

  it("exports the selected historical version without modifying Artifact state", () => {
    createLessonPlan("教案 v1", "第一版内容");
    createLessonPlan("教案 v2", "第二版内容");
    const before = listResourceArtifactVersions(window.localStorage, {
      courseProjectId: "project-export",
      lessonId: "L001",
      resourceType: "lesson_plan",
    });
    const historical = before.find((artifact) => artifact.version === 1)!;
    const snapshot = structuredClone(before);

    const markdown = resourceArtifactToMarkdown(historical);

    expect(markdown).toContain("第一版内容");
    expect(markdown).toContain("版本：v1（历史版本）");
    expect(markdown).not.toContain("第二版内容");
    expect(listResourceArtifactVersions(window.localStorage, {
      courseProjectId: "project-export",
      lessonId: "L001",
      resourceType: "lesson_plan",
    })).toEqual(snapshot);
  });
});
