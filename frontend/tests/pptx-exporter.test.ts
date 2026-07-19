import { describe, expect, it } from "vitest";

import type { ResourceArtifact } from "@/features/course-resources/resource-artifact-schema";
import {
  classifyTeachingSlide,
  createSlideOutlinePptxBlob,
} from "@/features/course-export/pptx-exporter";
import {
  PPTX_MIME_TYPE,
  type PptxExportContext,
} from "@/features/course-export/export-types";
import {
  makeSlideOutlineContent,
  resourceGenerationMetadata,
} from "./resource-artifact-fixtures";

function makeArtifact(): Extract<ResourceArtifact, { resourceType: "slide_outline" }> {
  return {
    schemaVersion: "1.0",
    resourceId: "f2d7c496-796f-4e9e-84e8-0d75e4371f20",
    courseProjectId: "project-pptx",
    moduleId: "M01",
    lessonId: "L001",
    resourceType: "slide_outline",
    title: "认识重复任务 PPT课件结构",
    status: "ready",
    version: 2,
    replacesResourceId: "ed2e1707-268a-4cf6-85c7-2cdd401c6ed8",
    sourceProjectUpdatedAt: "2026-07-17T09:00:00.000Z",
    generation: resourceGenerationMetadata,
    content: makeSlideOutlineContent(),
    createdAt: "2026-07-17T10:00:00.000Z",
    updatedAt: "2026-07-17T10:00:00.000Z",
  };
}

const context: PptxExportContext = {
  courseTitle: "Python 编程启蒙",
  lessonTitle: "认识重复任务",
  lessonNumber: 1,
};

describe("PPTX exporter", () => {
  it("creates a valid PPTX Blob without mutating the source data", async () => {
    const artifact = makeArtifact();
    const artifactSnapshot = structuredClone(artifact);
    const contextSnapshot = structuredClone(context);

    const blob = await createSlideOutlinePptxBlob(artifact, context);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    expect(blob.type).toBe(PPTX_MIME_TYPE);
    expect(blob.size).toBeGreaterThan(1_000);
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
    expect(artifact).toEqual(artifactSnapshot);
    expect(context).toEqual(contextSnapshot);
  });

  it("rejects incomplete export context", async () => {
    await expect(createSlideOutlinePptxBlob(makeArtifact(), {
      ...context,
      courseTitle: "",
    })).rejects.toThrow("PPTX 导出缺少有效的课程或课时信息");
  });

  it.each([
    ["content", { title: "循环概念", purpose: "讲解概念", speakerNotes: "说明概念" }],
    ["code", { title: "代码示例", purpose: "演示代码", speakerNotes: "const count = 1;" }],
    ["practice", { title: "课堂练习", purpose: "完成实践任务", speakerNotes: "组织练习" }],
    ["summary", { title: "课程总结", purpose: "回顾知识", speakerNotes: "完成总结" }],
  ] as const)("classifies a %s teaching slide", (expected, overrides) => {
    const slide = {
      ...makeArtifact().content.slides[0],
      ...overrides,
    };

    expect(classifyTeachingSlide(slide)).toBe(expected);
  });
});
