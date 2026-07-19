import {
  resourceArtifactSchema,
  type ResourceArtifact,
} from "@/features/course-resources/resource-artifact-schema";
import {
  RESOURCE_EXPORT_MIME_TYPES,
  ResourceExportError,
  type ResourceExportFormat,
} from "@/features/course-export/export-types";

const RESOURCE_FILE_NAMES = {
  lesson_plan: "lesson-plan",
  slide_outline: "slide-outline",
} as const;

function text(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

function list(items: string[]) {
  return items.length > 0
    ? items.map((item) => `- ${text(item)}`).join("\n")
    : "- 无";
}

function metadata(artifact: ResourceArtifact) {
  return [
    `> 课时：${artifact.lessonId}`,
    `> 版本：v${artifact.version}（${artifact.status === "ready" ? "最新版本" : "历史版本"}）`,
    `> 生成模型：${artifact.generation.provider} · ${artifact.generation.model}`,
    `> 生成时间：${artifact.generation.generatedAt}`,
  ].join("\n");
}

function lessonPlanMarkdown(artifact: Extract<ResourceArtifact, { resourceType: "lesson_plan" }>) {
  const content = artifact.content;
  const stages = content.stages.map((stage) => [
    `### ${stage.stageId} · ${text(stage.title)}（${stage.durationMinutes} 分钟）`,
    "",
    "#### 教师活动",
    "",
    list(stage.teacherActivities),
    "",
    "#### 学员活动",
    "",
    list(stage.learnerActivities),
    "",
    `**阶段评估：** ${text(stage.assessment)}`,
  ].join("\n")).join("\n\n");

  return [
    `# ${text(artifact.title)}`,
    "",
    metadata(artifact),
    "",
    "## 课时概述",
    "",
    text(content.summary),
    "",
    "## 教学目标",
    "",
    list(content.objectives),
    "",
    "## 核心知识点",
    "",
    list(content.keyPoints),
    "",
    "## 教学难点",
    "",
    list(content.difficultPoints),
    "",
    "## 课前准备",
    "",
    list(content.preparation),
    "",
    "## 教学流程",
    "",
    stages,
    "",
    "## 评估方案",
    "",
    text(content.assessment),
    "",
    "## 差异化支持",
    "",
    list(content.differentiation),
    "",
    "## 课后延伸",
    "",
    text(content.extension) || "无",
    "",
    "## 生成假设",
    "",
    list(content.assumptions),
    "",
    "## 质量检查",
    "",
    list(content.qualityChecklist),
    "",
  ].join("\n");
}

function slideOutlineMarkdown(artifact: Extract<ResourceArtifact, { resourceType: "slide_outline" }>) {
  const content = artifact.content;
  const slides = content.slides.map((slide) => [
    `### ${slide.slideId} · ${text(slide.title)}`,
    "",
    `**页面用途：** ${text(slide.purpose)}`,
    "",
    "**内容要点：**",
    "",
    list(slide.keyPoints),
    "",
    `**视觉建议：** ${text(slide.visualSuggestion)}`,
    "",
    `**讲解提示：** ${text(slide.speakerNotes)}`,
  ].join("\n")).join("\n\n");

  return [
    `# ${text(artifact.title)}`,
    "",
    metadata(artifact),
    "",
    "## 课件概述",
    "",
    text(content.overview),
    "",
    "## 幻灯片内容结构",
    "",
    slides,
    "",
    "## 生成假设",
    "",
    list(content.assumptions),
    "",
    "## 质量检查",
    "",
    list(content.qualityChecklist),
    "",
  ].join("\n");
}

export function parseResourceArtifactForExport(input: unknown): ResourceArtifact {
  const parsed = resourceArtifactSchema.safeParse(input);
  if (!parsed.success) {
    throw new ResourceExportError("当前课程资源已损坏或为空，无法导出。");
  }
  return parsed.data;
}

export function resourceArtifactToMarkdown(input: unknown) {
  const artifact = parseResourceArtifactForExport(input);
  return artifact.resourceType === "lesson_plan"
    ? lessonPlanMarkdown(artifact)
    : slideOutlineMarkdown(artifact);
}

export function getResourceExportFileName(
  input: unknown,
  format: ResourceExportFormat,
) {
  const artifact = parseResourceArtifactForExport(input);
  const extension = format === "docx" ? "docx" : "md";
  return `eduflow-${artifact.lessonId}-${RESOURCE_FILE_NAMES[artifact.resourceType]}-v${artifact.version}.${extension}`;
}

export function createMarkdownExportBlob(input: unknown) {
  return new Blob([resourceArtifactToMarkdown(input)], {
    type: RESOURCE_EXPORT_MIME_TYPES.markdown,
  });
}

export function downloadBlob(blob: Blob, fileName: string) {
  if (
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    throw new ResourceExportError("当前浏览器不支持文件下载。");
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  try {
    link.href = objectUrl;
    link.download = fileName;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }
}
