import { Clock3, Cpu, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  LessonPlanContent,
  ResourceArtifact,
  ResourceType,
  SlideOutlineContent,
} from "@/features/course-resources/resource-artifact-schema";
import { ExportPanel } from "@/features/course-export/export-panel";

const resourceLabels: Record<ResourceType, string> = {
  lesson_plan: "教师教案",
  slide_outline: "PPT课件结构",
};

function StringList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">无</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-[#44506a]">
      {items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
    </ul>
  );
}

function ResultField({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h5 className="text-sm font-semibold text-[#273149]">{title}</h5>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function LessonPlanResult({ content }: { content: LessonPlanContent }) {
  return (
    <div className="space-y-5">
      <ResultField title="课时概述">
        <p className="text-sm leading-6 text-[#44506a]">{content.summary}</p>
      </ResultField>
      <div className="grid gap-5 md:grid-cols-2">
        <ResultField title="教学目标"><StringList items={content.objectives} /></ResultField>
        <ResultField title="核心知识点"><StringList items={content.keyPoints} /></ResultField>
        <ResultField title="教学难点"><StringList items={content.difficultPoints} /></ResultField>
        <ResultField title="课前准备"><StringList items={content.preparation} /></ResultField>
      </div>
      <ResultField title="教学流程">
        <div className="space-y-3">
          {content.stages.map((stage) => (
            <article key={stage.stageId} className="rounded-lg border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h6 className="font-semibold text-[#273149]">{stage.stageId} · {stage.title}</h6>
                <Badge variant="outline">{stage.durationMinutes} 分钟</Badge>
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <ResultField title="教师活动"><StringList items={stage.teacherActivities} /></ResultField>
                <ResultField title="学员活动"><StringList items={stage.learnerActivities} /></ResultField>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#44506a]"><strong>阶段评估：</strong>{stage.assessment}</p>
            </article>
          ))}
        </div>
      </ResultField>
      <ResultField title="评估方案">
        <p className="text-sm leading-6 text-[#44506a]">{content.assessment}</p>
      </ResultField>
      <div className="grid gap-5 md:grid-cols-2">
        <ResultField title="差异化支持"><StringList items={content.differentiation} /></ResultField>
        <ResultField title="课后延伸">
          <p className="text-sm leading-6 text-[#44506a]">{content.extension || "无"}</p>
        </ResultField>
      </div>
      {content.assumptions.length > 0 && (
        <ResultField title="生成假设"><StringList items={content.assumptions} /></ResultField>
      )}
      <ResultField title="质量检查"><StringList items={content.qualityChecklist} /></ResultField>
    </div>
  );
}

function SlideOutlineResult({ content }: { content: SlideOutlineContent }) {
  return (
    <div className="space-y-5">
      <ResultField title="课件概述">
        <p className="text-sm leading-6 text-[#44506a]">{content.overview}</p>
      </ResultField>
      <ResultField title="幻灯片内容结构">
        <div className="space-y-3">
          {content.slides.map((slide) => (
            <article key={slide.slideId} className="rounded-lg border bg-white p-4">
              <h6 className="font-semibold text-[#273149]">{slide.slideId} · {slide.title}</h6>
              <p className="mt-2 text-sm leading-6 text-[#44506a]"><strong>页面用途：</strong>{slide.purpose}</p>
              <div className="mt-3"><StringList items={slide.keyPoints} /></div>
              <p className="mt-3 text-sm leading-6 text-[#44506a]"><strong>视觉建议：</strong>{slide.visualSuggestion}</p>
              <p className="mt-2 text-sm leading-6 text-[#44506a]"><strong>讲解提示：</strong>{slide.speakerNotes}</p>
            </article>
          ))}
        </div>
      </ResultField>
      {content.assumptions.length > 0 && (
        <ResultField title="生成假设"><StringList items={content.assumptions} /></ResultField>
      )}
      <ResultField title="质量检查"><StringList items={content.qualityChecklist} /></ResultField>
    </div>
  );
}

function GenerationMetadata({ artifact }: { artifact: ResourceArtifact }) {
  const usage = artifact.generation.usage;
  return (
    <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
      <p className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(artifact.generation.generatedAt))}</p>
      <p className="flex items-center gap-1.5"><Cpu className="size-3.5" />{artifact.generation.provider} · {artifact.generation.model}</p>
      <p>Token：{usage.totalTokens.toLocaleString("zh-CN")}（输入 {usage.promptTokens.toLocaleString("zh-CN")} / 输出 {usage.completionTokens.toLocaleString("zh-CN")}）</p>
      <p>{usage.estimatedCostUsd == null ? "成本：未提供" : `估算成本：$${usage.estimatedCostUsd.toFixed(6)}`}</p>
    </div>
  );
}

export function ResourceResultPanel({
  resourceType,
  versions,
  selectedResourceId,
  onSelectVersion,
}: {
  resourceType: ResourceType;
  versions: ResourceArtifact[];
  selectedResourceId?: string;
  onSelectVersion: (resourceId: string) => void;
}) {
  if (versions.length === 0) return null;
  const ready = versions.find((artifact) => artifact.status === "ready") ?? versions[0];
  const selected = versions.find((artifact) => artifact.resourceId === selectedResourceId) ?? ready;

  return (
    <section aria-label={`${resourceLabels[resourceType]}结果`} className="rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-[#273149]">{selected.title}</h4>
            <Badge variant={selected.status === "ready" ? "secondary" : "outline"}>
              {selected.status === "ready" ? "最新版本" : "历史版本"} · v{selected.version}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">只读内容 · {resourceLabels[resourceType]}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <ExportPanel key={selected.resourceId} artifact={selected} />
          {versions.length > 1 && (
            <nav aria-label={`${resourceLabels[resourceType]}历史版本`} className="flex flex-wrap items-center gap-1.5">
              <History className="mr-1 size-4 text-muted-foreground" />
              {versions.map((artifact) => (
                <Button
                  key={artifact.resourceId}
                  type="button"
                  size="sm"
                  variant={artifact.resourceId === selected.resourceId ? "default" : "outline"}
                  aria-label={`查看${resourceLabels[resourceType]} v${artifact.version}`}
                  onClick={() => onSelectVersion(artifact.resourceId)}
                >
                  v{artifact.version}
                </Button>
              ))}
            </nav>
          )}
        </div>
      </div>
      <div className="mt-4"><GenerationMetadata artifact={selected} /></div>
      <div className="mt-5 border-t pt-5">
        {selected.resourceType === "lesson_plan"
          ? <LessonPlanResult content={selected.content} />
          : <SlideOutlineResult content={selected.content} />}
      </div>
    </section>
  );
}
