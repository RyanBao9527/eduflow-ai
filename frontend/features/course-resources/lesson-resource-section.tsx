"use client";

import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ResourceType } from "@/features/course-resources/resource-artifact-schema";
import { ResourceResultPanel } from "@/features/course-resources/resource-result-panel";
import {
  LESSON_RESOURCE_TYPES,
  useLessonResources,
} from "@/features/course-resources/use-lesson-resources";
import type { CoursePlan } from "@/features/course-generation/course-plan-schema";
import type { CourseBrief } from "@/features/course-wizard/course-brief-schema";

const resourceLabels: Record<ResourceType, string> = {
  lesson_plan: "教师教案",
  slide_outline: "PPT结构",
};

export function LessonResourceSection({
  projectId,
  courseBrief,
  coursePlan,
  projectUpdatedAt,
  moduleId,
  lessonId,
  isEditing,
}: {
  projectId: string;
  courseBrief: CourseBrief;
  coursePlan: CoursePlan;
  projectUpdatedAt: string;
  moduleId: string;
  lessonId: string;
  isEditing: boolean;
}) {
  const {
    versions,
    readyArtifacts,
    selectedResourceIds,
    states,
    errors,
    generate,
    selectVersion,
  } = useLessonResources({
    projectId,
    courseBrief,
    coursePlan,
    projectUpdatedAt,
    moduleId,
    lessonId,
  });
  const lesson = coursePlan.lessonIndex.find((item) => item.lessonId === lessonId);
  const pptxContext = lesson
    ? {
        courseTitle: coursePlan.title || courseBrief.courseTitle,
        lessonTitle: lesson.title,
        lessonNumber: lesson.lessonNumber,
      }
    : undefined;

  return (
    <section
      aria-label={`${lessonId} 资源`}
      className="mt-4 rounded-lg border border-dashed bg-slate-50/70 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-[#44506a]">
            <Sparkles className="size-4" />课时资源
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {LESSON_RESOURCE_TYPES.map((resourceType) => {
              const artifact = readyArtifacts[resourceType];
              return artifact ? (
                <Badge key={resourceType} variant="secondary">
                  {resourceLabels[resourceType]} · 已生成 · v{artifact.version}
                </Badge>
              ) : (
                <Badge key={resourceType} variant="outline">
                  {resourceLabels[resourceType]} · 未生成
                </Badge>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {LESSON_RESOURCE_TYPES.map((resourceType) => {
            const state = states[resourceType];
            const existing = readyArtifacts[resourceType];
            return (
              <Button
                key={resourceType}
                type="button"
                size="sm"
                variant={resourceType === "lesson_plan" ? "default" : "outline"}
                disabled={isEditing || state === "generating"}
                onClick={() => {
                  if (!isEditing) void generate(resourceType);
                }}
              >
                {state === "generating" && <Loader2 className="size-4 animate-spin" />}
                {existing ? "重新生成" : "生成"}{resourceLabels[resourceType]}
              </Button>
            );
          })}
        </div>
      </div>
      {isEditing && (
        <p className="mt-2 text-xs text-muted-foreground">请先保存课程修改，再生成课时资源。</p>
      )}
      <div aria-live="polite" className="mt-2 space-y-1 text-xs">
        {LESSON_RESOURCE_TYPES.map((resourceType) => {
          const state = states[resourceType];
          if (state === "success") {
            return (
              <p key={resourceType} className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                {resourceLabels[resourceType]}已保存为 v{readyArtifacts[resourceType]?.version}
              </p>
            );
          }
          if (state === "error") {
            return (
              <p key={resourceType} role="alert" className="flex items-center gap-1 text-red-700">
                <AlertCircle className="size-3.5" />
                {errors[resourceType]}
              </p>
            );
          }
          return null;
        })}
      </div>
      <div className="mt-4 space-y-4">
        {LESSON_RESOURCE_TYPES.map((resourceType) => (
          <ResourceResultPanel
            key={resourceType}
            resourceType={resourceType}
            versions={versions[resourceType]}
            selectedResourceId={selectedResourceIds[resourceType]}
            onSelectVersion={(resourceId) => selectVersion(resourceType, resourceId)}
            pptxContext={pptxContext}
          />
        ))}
      </div>
    </section>
  );
}
