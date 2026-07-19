import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import type { ResourceArtifact } from "@/features/course-resources/resource-artifact-schema";
import { RESOURCE_EXPORT_MIME_TYPES } from "@/features/course-export/export-types";

type LessonPlanArtifact = Extract<ResourceArtifact, { resourceType: "lesson_plan" }>;

function heading(value: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({ text: value, heading: level });
}

function paragraph(value: string) {
  return new Paragraph({ children: [new TextRun(value || "无")] });
}

function bullets(items: string[]) {
  return items.length > 0
    ? items.map((item) => new Paragraph({ text: item, bullet: { level: 0 } }))
    : [new Paragraph({ text: "无", bullet: { level: 0 } })];
}

export async function createLessonPlanDocxBlob(artifact: LessonPlanArtifact) {
  const content = artifact.content;
  const children: Paragraph[] = [
    heading(artifact.title, HeadingLevel.TITLE),
    paragraph(`课时：${artifact.lessonId}`),
    paragraph(`版本：v${artifact.version}（${artifact.status === "ready" ? "最新版本" : "历史版本"}）`),
    paragraph(`生成模型：${artifact.generation.provider} · ${artifact.generation.model}`),
    paragraph(`生成时间：${artifact.generation.generatedAt}`),
    heading("课时概述", HeadingLevel.HEADING_1),
    paragraph(content.summary),
    heading("教学目标", HeadingLevel.HEADING_1),
    ...bullets(content.objectives),
    heading("核心知识点", HeadingLevel.HEADING_1),
    ...bullets(content.keyPoints),
    heading("教学难点", HeadingLevel.HEADING_1),
    ...bullets(content.difficultPoints),
    heading("课前准备", HeadingLevel.HEADING_1),
    ...bullets(content.preparation),
    heading("教学流程", HeadingLevel.HEADING_1),
  ];

  for (const stage of content.stages) {
    children.push(
      heading(`${stage.stageId} · ${stage.title}（${stage.durationMinutes} 分钟）`, HeadingLevel.HEADING_2),
      heading("教师活动", HeadingLevel.HEADING_3),
      ...bullets(stage.teacherActivities),
      heading("学员活动", HeadingLevel.HEADING_3),
      ...bullets(stage.learnerActivities),
      paragraph(`阶段评估：${stage.assessment}`),
    );
  }

  children.push(
    heading("评估方案", HeadingLevel.HEADING_1),
    paragraph(content.assessment),
    heading("差异化支持", HeadingLevel.HEADING_1),
    ...bullets(content.differentiation),
    heading("课后延伸", HeadingLevel.HEADING_1),
    paragraph(content.extension),
    heading("生成假设", HeadingLevel.HEADING_1),
    ...bullets(content.assumptions),
    heading("质量检查", HeadingLevel.HEADING_1),
    ...bullets(content.qualityChecklist),
  );

  const documentFile = new Document({
    sections: [{ properties: {}, children }],
  });
  const blob = await Packer.toBlob(documentFile);
  return new Blob([blob], { type: RESOURCE_EXPORT_MIME_TYPES.docx });
}
