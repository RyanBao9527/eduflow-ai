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
  type ResourceExportFile,
  type ResourceExportFormat,
} from "@/features/course-export/export-types";

export async function createResourceExportFile(
  input: unknown,
  format: ResourceExportFormat,
): Promise<ResourceExportFile> {
  const artifact = parseResourceArtifactForExport(input);
  if (!RESOURCE_EXPORT_FORMATS[artifact.resourceType].includes(format)) {
    throw new ResourceExportError("当前课程资源不支持所选导出格式。");
  }

  const blob = format === "markdown"
    ? createMarkdownExportBlob(artifact)
    : await createDocxFile(artifact);

  return {
    blob,
    fileName: getResourceExportFileName(artifact, format),
    mimeType: RESOURCE_EXPORT_MIME_TYPES[format],
  };
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
) {
  const file = await createResourceExportFile(input, format);
  downloadBlob(file.blob, file.fileName);
  return file;
}
