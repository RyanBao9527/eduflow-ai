import type { ResourceType } from "@/features/course-resources/resource-artifact-schema";

export type ResourceExportFormat = "markdown" | "docx";

export interface ResourceExportFile {
  blob: Blob;
  fileName: string;
  mimeType: string;
}

export const RESOURCE_EXPORT_FORMATS: Record<
  ResourceType,
  readonly ResourceExportFormat[]
> = {
  lesson_plan: ["docx", "markdown"],
  slide_outline: ["markdown"],
};

export const RESOURCE_EXPORT_MIME_TYPES: Record<ResourceExportFormat, string> = {
  markdown: "text/markdown;charset=utf-8",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export class ResourceExportError extends Error {
  constructor(message = "课程资源导出失败，请重试。") {
    super(message);
    this.name = "ResourceExportError";
  }
}
