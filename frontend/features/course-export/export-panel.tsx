"use client";

import { useState } from "react";

import type { ResourceArtifact } from "@/features/course-resources/resource-artifact-schema";
import { ExportButton } from "@/features/course-export/export-button";
import { downloadResourceArtifact } from "@/features/course-export/export-service";
import {
  RESOURCE_EXPORT_FORMATS,
  ResourceExportError,
  type PptxExportContext,
  type ResourceExportFormat,
} from "@/features/course-export/export-types";

const formatLabels: Record<ResourceExportFormat, string> = {
  docx: "导出 Word",
  markdown: "导出 Markdown",
  pptx: "导出 PowerPoint",
};

export function ExportPanel({
  artifact,
  pptxContext,
}: {
  artifact: ResourceArtifact;
  pptxContext?: PptxExportContext;
}) {
  const [pendingFormat, setPendingFormat] = useState<ResourceExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportArtifact = async (format: ResourceExportFormat) => {
    if (pendingFormat) return;
    setPendingFormat(format);
    setError(null);
    try {
      await downloadResourceArtifact(
        artifact,
        format,
        format === "pptx" ? pptxContext : undefined,
      );
    } catch (caught) {
      setError(
        caught instanceof ResourceExportError
          ? caught.message
          : "课程资源导出失败，请重试。",
      );
    } finally {
      setPendingFormat(null);
    }
  };

  return (
    <div aria-label="资源导出" className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2">
        {RESOURCE_EXPORT_FORMATS[artifact.resourceType]
          .filter((format) => format !== "pptx" || pptxContext)
          .map((format) => (
            <ExportButton
              key={format}
              label={formatLabels[format]}
              pending={pendingFormat === format}
              disabled={pendingFormat !== null && pendingFormat !== format}
              onClick={() => void exportArtifact(format)}
            />
          ))}
      </div>
      <p className="text-xs text-muted-foreground">导出当前查看的 v{artifact.version}</p>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
