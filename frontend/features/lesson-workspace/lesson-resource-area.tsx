"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import { ResourceResultPanel } from "@/features/course-resources/resource-result-panel";
import type { ResourceType } from "@/features/course-resources/resource-artifact-schema";
import {
  LESSON_RESOURCE_TYPES,
  useLessonResources,
} from "@/features/course-resources/use-lesson-resources";
import type { CoursePlan } from "@/features/course-generation/course-plan-schema";
import type { CourseBrief } from "@/features/course-wizard/course-brief-schema";
import { LessonResourceCard } from "@/features/lesson-workspace/lesson-resource-card";

export function LessonResourceArea({
  projectId,
  courseBrief,
  coursePlan,
  projectUpdatedAt,
  moduleId,
  lessonId,
}: {
  projectId: string;
  courseBrief: CourseBrief;
  coursePlan: CoursePlan;
  projectUpdatedAt: string;
  moduleId: string;
  lessonId: string;
}) {
  const [visibleResourceType, setVisibleResourceType] = useState<ResourceType | null>(null);
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

  const generateAndOpen = async (resourceType: ResourceType) => {
    const artifact = await generate(resourceType);
    if (artifact) setVisibleResourceType(resourceType);
  };

  return (
    <section aria-labelledby="lesson-resources-title" className="space-y-4">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
          单课教学准备
        </p>
        <h2 id="lesson-resources-title" className="mt-2 text-xl font-bold text-[#273149]">
          教学资源
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          按需生成本课资源。生成结果以只读版本保存到当前设备。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {LESSON_RESOURCE_TYPES.map((resourceType) => (
          <LessonResourceCard
            key={resourceType}
            resourceType={resourceType}
            readyArtifact={readyArtifacts[resourceType]}
            state={states[resourceType]}
            error={errors[resourceType]}
            expanded={visibleResourceType === resourceType}
            onGenerate={() => void generateAndOpen(resourceType)}
            onToggleView={() => setVisibleResourceType((current) =>
              current === resourceType ? null : resourceType)}
          />
        ))}
      </div>

      {visibleResourceType && versions[visibleResourceType].length > 0 && (
        <ResourceResultPanel
          resourceType={visibleResourceType}
          versions={versions[visibleResourceType]}
          selectedResourceId={selectedResourceIds[visibleResourceType]}
          onSelectVersion={(resourceId) => selectVersion(visibleResourceType, resourceId)}
        />
      )}
    </section>
  );
}
