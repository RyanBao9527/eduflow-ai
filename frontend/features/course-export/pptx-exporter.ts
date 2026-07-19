import PptxGenJS from "pptxgenjs";

import type { ResourceArtifact } from "@/features/course-resources/resource-artifact-schema";
import {
  PPTX_MIME_TYPE,
  ResourceExportError,
  type PptxExportContext,
} from "@/features/course-export/export-types";

type SlideOutlineArtifact = Extract<ResourceArtifact, { resourceType: "slide_outline" }>;
type SlideOutlineItem = SlideOutlineArtifact["content"]["slides"][number];

export type TeachingSlideKind = "content" | "code" | "practice" | "summary";

const COLORS = {
  canvas: "F7F8FC",
  ink: "273149",
  muted: "667085",
  primary: "4F46E5",
  primarySoft: "EEF2FF",
  practice: "0F766E",
  practiceSoft: "ECFDF5",
  code: "111827",
  codeText: "E5E7EB",
  white: "FFFFFF",
  line: "D7DBE7",
} as const;

const TITLE_MAX_LENGTH = 80;
const BODY_MAX_LENGTH = 220;

function clean(value: string, maxLength = BODY_MAX_LENGTH) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}…`
    : normalized;
}

function containsAny(value: string, keywords: readonly string[]) {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function combinedSlideText(slide: SlideOutlineItem) {
  return [
    slide.title,
    slide.purpose,
    ...slide.keyPoints,
    slide.visualSuggestion,
    slide.speakerNotes,
  ].join("\n");
}

export function classifyTeachingSlide(slide: SlideOutlineItem): TeachingSlideKind {
  const value = combinedSlideText(slide);
  if (containsAny(value, ["总结", "小结", "回顾", "summary", "recap"])) {
    return "summary";
  }
  if (containsAny(value, ["练习", "实践", "任务", "挑战", "practice", "exercise", "challenge"])) {
    return "practice";
  }
  if (
    containsAny(value, ["代码", "编程", "code", "function ", "const ", "let ", "def ", "print(", "console."])
    || /```[\s\S]*```/.test(value)
  ) {
    return "code";
  }
  return "content";
}

function assertContext(context: PptxExportContext) {
  if (
    !context.courseTitle.trim()
    || !context.lessonTitle.trim()
    || !Number.isInteger(context.lessonNumber)
    || context.lessonNumber < 1
  ) {
    throw new ResourceExportError("PPTX 导出缺少有效的课程或课时信息。");
  }
}

function addFooter(slide: PptxGenJS.Slide, lessonId: string, pageNumber: number) {
  slide.addShape("line", {
    x: 0.65,
    y: 7.05,
    w: 12.05,
    h: 0,
    line: { color: COLORS.line, width: 1 },
  });
  slide.addText(`EduFlow AI · ${lessonId}`, {
    x: 0.7,
    y: 7.12,
    w: 4,
    h: 0.2,
    fontFace: "Aptos",
    fontSize: 10,
    color: COLORS.muted,
    margin: 0,
  });
  slide.addText(String(pageNumber), {
    x: 11.9,
    y: 7.12,
    w: 0.7,
    h: 0.2,
    align: "right",
    fontFace: "Aptos",
    fontSize: 10,
    color: COLORS.muted,
    margin: 0,
  });
}

function addSlideTitle(slide: PptxGenJS.Slide, title: string, eyebrow: string) {
  slide.addText(eyebrow, {
    x: 0.75,
    y: 0.45,
    w: 4.5,
    h: 0.3,
    fontFace: "Aptos",
    fontSize: 12,
    bold: true,
    color: COLORS.primary,
    charSpacing: 1.2,
    margin: 0,
  });
  slide.addText(clean(title, TITLE_MAX_LENGTH), {
    x: 0.75,
    y: 0.85,
    w: 11.7,
    h: 0.72,
    fontFace: "Aptos Display",
    fontSize: 35,
    bold: true,
    color: COLORS.ink,
    fit: "shrink",
    margin: 0,
    breakLine: false,
  });
}

function addKeyPoints(
  slide: PptxGenJS.Slide,
  keyPoints: string[],
  options: { x?: number; y?: number; w?: number; h?: number; color?: string } = {},
) {
  const points = keyPoints.slice(0, 5).map((point) => `•  ${clean(point)}`).join("\n\n");
  slide.addText(points || "•  暂无内容要点", {
    x: options.x ?? 1,
    y: options.y ?? 2.05,
    w: options.w ?? 11.25,
    h: options.h ?? 3.5,
    fontFace: "Aptos",
    fontSize: 22,
    color: options.color ?? COLORS.ink,
    breakLine: false,
    valign: "middle",
    fit: "shrink",
    margin: 0.16,
    paraSpaceAfter: 12,
  });
}

function addCoverSlide(
  presentation: PptxGenJS,
  artifact: SlideOutlineArtifact,
  context: PptxExportContext,
) {
  const slide = presentation.addSlide();
  slide.background = { color: COLORS.ink };
  slide.addShape(presentation.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.18,
    h: 7.5,
    fill: { color: COLORS.primary },
    line: { color: COLORS.primary },
  });
  slide.addText(clean(context.courseTitle, 90), {
    x: 0.9,
    y: 1.25,
    w: 10.9,
    h: 0.5,
    fontFace: "Aptos",
    fontSize: 20,
    bold: true,
    color: "A5B4FC",
    margin: 0,
  });
  slide.addText(clean(context.lessonTitle, 100), {
    x: 0.9,
    y: 2,
    w: 11.2,
    h: 1.55,
    fontFace: "Aptos Display",
    fontSize: 50,
    bold: true,
    color: COLORS.white,
    fit: "shrink",
    margin: 0,
    valign: "middle",
  });
  slide.addText(`第 ${context.lessonNumber} 课  ·  ${artifact.lessonId}  ·  v${artifact.version}`, {
    x: 0.9,
    y: 4.05,
    w: 8,
    h: 0.45,
    fontFace: "Aptos",
    fontSize: 20,
    color: "CBD5E1",
    margin: 0,
  });
  slide.addText("AI Course Studio", {
    x: 0.9,
    y: 6.55,
    w: 3.5,
    h: 0.3,
    fontFace: "Aptos",
    fontSize: 12,
    bold: true,
    color: "94A3B8",
    margin: 0,
  });
}

function extractCode(slide: SlideOutlineItem) {
  const source = [slide.speakerNotes, ...slide.keyPoints].join("\n");
  const fenced = source.match(/```(?:[a-z0-9_-]+)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) return fenced;
  const likelyCode = source
    .split("\n")
    .filter((line) => /(?:function |const |let |def |print\(|console\.|=>|[{};])/.test(line))
    .join("\n")
    .trim();
  return likelyCode || slide.keyPoints.join("\n");
}

function addContentSlide(
  presentation: PptxGenJS,
  item: SlideOutlineItem,
  pageNumber: number,
  lessonId: string,
) {
  const slide = presentation.addSlide();
  slide.background = { color: COLORS.canvas };
  addSlideTitle(slide, item.title, `${item.slideId} · 课程内容`);
  slide.addShape(presentation.ShapeType.roundRect, {
    x: 0.75,
    y: 1.8,
    w: 11.8,
    h: 4.85,
    rectRadius: 0.08,
    fill: { color: COLORS.white },
    line: { color: COLORS.line, width: 1 },
  });
  addKeyPoints(slide, item.keyPoints, { x: 1.05, y: 2.05, w: 11.1, h: 3.65 });
  slide.addText(clean(item.purpose), {
    x: 1.05,
    y: 5.9,
    w: 11,
    h: 0.45,
    fontFace: "Aptos",
    fontSize: 14,
    italic: true,
    color: COLORS.muted,
    fit: "shrink",
    margin: 0,
  });
  slide.addNotes(item.speakerNotes);
  addFooter(slide, lessonId, pageNumber);
}

function addCodeSlide(
  presentation: PptxGenJS,
  item: SlideOutlineItem,
  pageNumber: number,
  lessonId: string,
) {
  const slide = presentation.addSlide();
  slide.background = { color: COLORS.canvas };
  addSlideTitle(slide, item.title, `${item.slideId} · 代码示例`);
  slide.addShape(presentation.ShapeType.roundRect, {
    x: 0.8,
    y: 1.8,
    w: 11.7,
    h: 4.85,
    rectRadius: 0.06,
    fill: { color: COLORS.code },
    line: { color: "374151", width: 1 },
  });
  slide.addText(clean(extractCode(item), 700), {
    x: 1.08,
    y: 2.1,
    w: 11.1,
    h: 4.15,
    fontFace: "Courier New",
    fontSize: 18,
    color: COLORS.codeText,
    breakLine: false,
    fit: "shrink",
    margin: 0.12,
    valign: "top",
  });
  slide.addNotes(item.speakerNotes);
  addFooter(slide, lessonId, pageNumber);
}

function addPracticeSlide(
  presentation: PptxGenJS,
  item: SlideOutlineItem,
  pageNumber: number,
  lessonId: string,
) {
  const slide = presentation.addSlide();
  slide.background = { color: COLORS.practiceSoft };
  addSlideTitle(slide, item.title, `${item.slideId} · 实践任务`);
  slide.addShape(presentation.ShapeType.roundRect, {
    x: 0.85,
    y: 1.8,
    w: 11.65,
    h: 4.9,
    rectRadius: 0.08,
    fill: { color: COLORS.white },
    line: { color: "A7F3D0", width: 1.4 },
  });
  slide.addText("动手实践", {
    x: 1.15,
    y: 2.15,
    w: 2.4,
    h: 0.45,
    fontFace: "Aptos",
    fontSize: 22,
    bold: true,
    color: COLORS.practice,
    margin: 0,
  });
  addKeyPoints(slide, item.keyPoints, { x: 1.15, y: 2.8, w: 10.8, h: 2.8 });
  slide.addText(clean(item.purpose), {
    x: 1.15,
    y: 5.75,
    w: 10.8,
    h: 0.48,
    fontFace: "Aptos",
    fontSize: 15,
    color: COLORS.muted,
    fit: "shrink",
    margin: 0,
  });
  slide.addNotes(item.speakerNotes);
  addFooter(slide, lessonId, pageNumber);
}

function addSummarySlide(
  presentation: PptxGenJS,
  item: SlideOutlineItem,
  pageNumber: number,
  lessonId: string,
) {
  const slide = presentation.addSlide();
  slide.background = { color: COLORS.primarySoft };
  addSlideTitle(slide, item.title, `${item.slideId} · 课程总结`);
  slide.addShape(presentation.ShapeType.roundRect, {
    x: 1.05,
    y: 1.85,
    w: 11.2,
    h: 4.75,
    rectRadius: 0.08,
    fill: { color: COLORS.white, transparency: 3 },
    line: { color: "C7D2FE", width: 1.3 },
  });
  addKeyPoints(slide, item.keyPoints, { x: 1.4, y: 2.15, w: 10.5, h: 3.8 });
  slide.addNotes(item.speakerNotes);
  addFooter(slide, lessonId, pageNumber);
}

export async function createSlideOutlinePptxBlob(
  artifact: SlideOutlineArtifact,
  context: PptxExportContext,
) {
  assertContext(context);
  const presentation = new PptxGenJS();
  presentation.layout = "LAYOUT_WIDE";
  presentation.author = "EduFlow AI";
  presentation.company = "EduFlow AI";
  presentation.subject = `${context.courseTitle} · ${context.lessonTitle}`;
  presentation.title = context.lessonTitle;
  presentation.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos",
  };

  addCoverSlide(presentation, artifact, context);
  artifact.content.slides.forEach((item, index) => {
    const pageNumber = index + 2;
    const kind = classifyTeachingSlide(item);
    if (kind === "code") addCodeSlide(presentation, item, pageNumber, artifact.lessonId);
    else if (kind === "practice") addPracticeSlide(presentation, item, pageNumber, artifact.lessonId);
    else if (kind === "summary") addSummarySlide(presentation, item, pageNumber, artifact.lessonId);
    else addContentSlide(presentation, item, pageNumber, artifact.lessonId);
  });

  const output = await presentation.write({ outputType: "blob", compression: true });
  if (!(output instanceof Blob)) {
    throw new ResourceExportError("PPTX 文件生成失败，请重试。");
  }
  return new Blob([output], { type: PPTX_MIME_TYPE });
}
