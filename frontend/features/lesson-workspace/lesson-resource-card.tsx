"use client";

import { AlertCircle, CheckCircle2, FileText, Loader2, Presentation } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ResourceArtifact,
  ResourceType,
} from "@/features/course-resources/resource-artifact-schema";
import type { ResourceGenerationState } from "@/features/course-resources/use-lesson-resources";

const resourceCopy: Record<ResourceType, {
  title: string;
  description: string;
  generateLabel: string;
  viewLabel: string;
}> = {
  lesson_plan: {
    title: "教师教案",
    description: "完整教学流程、课堂活动与评估安排。",
    generateLabel: "生成教案",
    viewLabel: "查看教案",
  },
  slide_outline: {
    title: "PPT课件结构",
    description: "幻灯片结构、页面要点与讲解提示。",
    generateLabel: "生成PPT结构",
    viewLabel: "查看PPT结构",
  },
};

export function LessonResourceCard({
  resourceType,
  readyArtifact,
  state,
  error,
  expanded,
  onGenerate,
  onToggleView,
}: {
  resourceType: ResourceType;
  readyArtifact?: ResourceArtifact;
  state: ResourceGenerationState;
  error?: string;
  expanded: boolean;
  onGenerate: () => void;
  onToggleView: () => void;
}) {
  const copy = resourceCopy[resourceType];
  const Icon = resourceType === "lesson_plan" ? FileText : Presentation;
  const generating = state === "generating";

  return (
    <Card className="h-full" aria-label={`${copy.title}资源卡片`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f2f5ff] text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          {readyArtifact ? (
            <Badge variant="secondary">已生成 v{readyArtifact.version}</Badge>
          ) : (
            <Badge variant="outline">未生成</Badge>
          )}
        </div>
        <CardTitle className="mt-3 text-lg">{copy.title}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">{copy.description}</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {readyArtifact && (
            <Button type="button" size="sm" variant="outline" onClick={onToggleView}>
              {expanded ? `收起${copy.title}` : copy.viewLabel}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={generating}
            aria-label={readyArtifact ? `重新生成${copy.title}` : copy.generateLabel}
            onClick={onGenerate}
          >
            {generating && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {generating ? "正在生成…" : readyArtifact ? "重新生成" : copy.generateLabel}
          </Button>
        </div>

        <div aria-live="polite" className="mt-3 min-h-5 text-xs">
          {state === "success" && readyArtifact && (
            <p className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              {copy.title}已保存为 v{readyArtifact.version}
            </p>
          )}
          {state === "error" && error && (
            <p role="alert" className="flex items-center gap-1 text-red-700">
              <AlertCircle className="size-3.5" aria-hidden="true" />
              {error}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
