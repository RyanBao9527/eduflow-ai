"use client";

import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResourceGenerationApiError,
  generateLessonResource,
} from "@/features/course-resources/resource-generation-api";
import type {
  ResourceArtifact,
  ResourceType,
} from "@/features/course-resources/resource-artifact-schema";
import {
  createResourceArtifactVersion,
  listResourceArtifactVersions,
  ResourceArtifactStorageError,
} from "@/features/course-resources/resource-artifact-storage";
import { ResourceResultPanel } from "@/features/course-resources/resource-result-panel";
import type { CoursePlan } from "@/features/course-generation/course-plan-schema";
import type { CourseBrief } from "@/features/course-wizard/course-brief-schema";

type ResourceGenerationState = "idle" | "generating" | "success" | "error";

const resourceLabels: Record<ResourceType, string> = {
  lesson_plan: "教师教案",
  slide_outline: "PPT结构",
};

const initialStates: Record<ResourceType, ResourceGenerationState> = {
  lesson_plan: "idle",
  slide_outline: "idle",
};

type ArtifactVersions = Record<ResourceType, ResourceArtifact[]>;

function readArtifactVersions(projectId: string, lessonId: string): ArtifactVersions {
  if (typeof window === "undefined") return { lesson_plan: [], slide_outline: [] };
  return {
    lesson_plan: listResourceArtifactVersions(window.localStorage, {
      courseProjectId: projectId,
      lessonId,
      resourceType: "lesson_plan",
    }),
    slide_outline: listResourceArtifactVersions(window.localStorage, {
      courseProjectId: projectId,
      lessonId,
      resourceType: "slide_outline",
    }),
  };
}

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
  const [versions, setVersions] = useState<ArtifactVersions>(() =>
    readArtifactVersions(projectId, lessonId));
  const [selectedResourceIds, setSelectedResourceIds] = useState<
    Partial<Record<ResourceType, string>>
  >({});
  const [states, setStates] = useState<Record<ResourceType, ResourceGenerationState>>(initialStates);
  const [errors, setErrors] = useState<Partial<Record<ResourceType, string>>>({});

  const readyArtifacts: Partial<Record<ResourceType, ResourceArtifact>> = {
    lesson_plan: versions.lesson_plan.find((artifact) => artifact.status === "ready"),
    slide_outline: versions.slide_outline.find((artifact) => artifact.status === "ready"),
  };

  const generate = async (resourceType: ResourceType) => {
    if (isEditing || states[resourceType] === "generating") return;
    setStates((current) => ({ ...current, [resourceType]: "generating" }));
    setErrors((current) => ({ ...current, [resourceType]: undefined }));

    try {
      const response = await generateLessonResource({
        courseProjectId: projectId,
        resourceType,
        lessonId,
        courseBrief,
        coursePlan,
      });
      if (
        response.courseProjectId !== projectId ||
        response.resource.resourceType !== resourceType ||
        response.resource.moduleId !== moduleId ||
        response.resource.lessonId !== lessonId
      ) {
        throw new ResourceGenerationApiError(
          "资源生成服务返回了不匹配的课时数据，请重试。",
          "RESOURCE_CONTEXT_MISMATCH",
        );
      }
      const artifactBase = {
        courseProjectId: projectId,
        moduleId,
        lessonId,
        title: response.resource.title,
        sourceProjectUpdatedAt: projectUpdatedAt,
        generation: {
          requestId: response.requestId,
          ...response.generation,
        },
      };
      const artifact = response.resource.resourceType === "lesson_plan"
        ? createResourceArtifactVersion(window.localStorage, {
            ...artifactBase,
            resourceType: "lesson_plan",
            content: response.resource.content,
          })
        : createResourceArtifactVersion(window.localStorage, {
            ...artifactBase,
            resourceType: "slide_outline",
            content: response.resource.content,
          });
      setVersions((current) => ({
        ...current,
        [resourceType]: listResourceArtifactVersions(window.localStorage, {
          courseProjectId: projectId,
          lessonId,
          resourceType,
        }),
      }));
      setSelectedResourceIds((current) => ({
        ...current,
        [resourceType]: artifact.resourceId,
      }));
      setStates((current) => ({ ...current, [resourceType]: "success" }));
    } catch (error) {
      const message =
        error instanceof ResourceGenerationApiError || error instanceof ResourceArtifactStorageError
          ? error.message
          : "课程资源生成失败，请重试。";
      setErrors((current) => ({ ...current, [resourceType]: message }));
      setStates((current) => ({ ...current, [resourceType]: "error" }));
    }
  };

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
            {(["lesson_plan", "slide_outline"] as const).map((resourceType) => {
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
          {(["lesson_plan", "slide_outline"] as const).map((resourceType) => {
            const state = states[resourceType];
            const existing = readyArtifacts[resourceType];
            return (
              <Button
                key={resourceType}
                type="button"
                size="sm"
                variant={resourceType === "lesson_plan" ? "default" : "outline"}
                disabled={isEditing || state === "generating"}
                onClick={() => generate(resourceType)}
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
        {(["lesson_plan", "slide_outline"] as const).map((resourceType) => {
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
        {(["lesson_plan", "slide_outline"] as const).map((resourceType) => (
          <ResourceResultPanel
            key={resourceType}
            resourceType={resourceType}
            versions={versions[resourceType]}
            selectedResourceId={selectedResourceIds[resourceType]}
            onSelectVersion={(resourceId) => setSelectedResourceIds((current) => ({
              ...current,
              [resourceType]: resourceId,
            }))}
          />
        ))}
      </div>
    </section>
  );
}
