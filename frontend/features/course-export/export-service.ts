import type { ResourceArtifact } from "@/features/course-resources/resource-artifact-schema";
import {
  createMarkdownExportBlob,
  downloadBlob,
  getResourceExportFileName,
  parseResourceArtifactForExport,
} from "@/features/course-export/export-utils";
import {
  RESOURCE_EXPORT_FORMATS,
  RESOURCE_EXPORT_MIME_TYPES,
  ResourceExportError,
  type PptxExportContext,
  type ResourceExportFile,
  type ResourceExportFormat,
} from "@/features/course-export/export-types";

export async function createResourceExportFile(
  input: unknown,
  format: ResourceExportFormat,
  pptxContext?: PptxExportContext,
): Promise<ResourceExportFile> {
  const artifact = parseResourceArtifactForExport(input);
  if (!RESOURCE_EXPORT_FORMATS[artifact.resourceType].includes(format)) {
    throw new ResourceExportError("当前课程资源不支持所选导出格式。");
  }

  const blob = format === "markdown"
    ? createMarkdownExportBlob(artifact)
    : format === "docx"
      ? await createDocxFile(artifact)
      : await createPptxFile(artifact, pptxContext);

  return {
    blob,
    fileName: getResourceExportFileName(artifact, format),
    mimeType: RESOURCE_EXPORT_MIME_TYPES[format],
  };
}

async function createPptxFile(
  artifact: ResourceArtifact,
  context?: PptxExportContext,
) {
  if (artifact.resourceType !== "slide_outline") {
    throw new ResourceExportError("只有 PPT课件结构支持 PowerPoint 导出。");
  }
  if (!context) {
    throw new ResourceExportError("PPTX 导出缺少课程或课时信息。");
  }
  const { createSlideOutlinePptxBlob } = await import(
    "@/features/course-export/pptx-exporter"
  );
  return createSlideOutlinePptxBlob(artifact, context);
}

async function createDocxFile(artifact: ResourceArtifact) {
  if (artifact.resourceType !== "lesson_plan") {
    throw new ResourceExportError("只有教师教案支持 Word 导出。");
  }
  const { createLessonPlanDocxBlob } = await import(
    "@/features/course-export/docx-exporter"
  );
  return createLessonPlanDocxBlob(artifact);
}

export async function downloadResourceArtifact(
  input: unknown,
  format: ResourceExportFormat,
  pptxContext?: PptxExportContext,
) {
  const file = await createResourceExportFile(input, format, pptxContext);
  downloadBlob(file.blob, file.fileName);
  return file;
}
