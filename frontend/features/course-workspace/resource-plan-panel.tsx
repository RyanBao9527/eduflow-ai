import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CoursePlan } from "@/features/course-generation/course-plan-schema";
import { RESOURCE_OPTIONS } from "@/features/course-wizard/constants";

const resourceLabels = Object.fromEntries(
  RESOURCE_OPTIONS.map((resource) => [resource.value, resource.label]),
) as Record<string, string>;

type ResourcePlanItem = CoursePlan["resourcePlan"][number];

function getResourceScope(plan: CoursePlan, resource: ResourcePlanItem) {
  const explicitLessonIds = new Set(resource.lessonIds);
  const selectedModuleIds = new Set(resource.moduleIds);

  plan.lessonIndex.forEach((lesson) => {
    if (explicitLessonIds.has(lesson.lessonId)) selectedModuleIds.add(lesson.moduleId);
  });

  const lessonIds = plan.lessonIndex
    .filter((lesson) =>
      explicitLessonIds.size > 0
        ? explicitLessonIds.has(lesson.lessonId)
        : selectedModuleIds.has(lesson.moduleId),
    )
    .map((lesson) => lesson.lessonId);
  const modules = plan.modules
    .filter((module) => selectedModuleIds.has(module.moduleId))
    .map((module) => `${module.moduleId} · ${module.title}`);
  const phases = plan.detailMode === "balanced"
    ? plan.phases
        .filter((phase) =>
          phase.moduleIds.some((moduleId) => selectedModuleIds.has(moduleId))
          || phase.lessonIds.some((lessonId) => lessonIds.includes(lessonId)),
        )
        .map((phase) => `${phase.phaseId} · ${phase.title}`)
    : [];

  return { lessonIds, modules, phases };
}

function formatLessonScope(lessonIds: string[]) {
  if (lessonIds.length === 0) return "适用于全课程";
  if (lessonIds.length <= 8) return lessonIds.join("、");
  return `${lessonIds.slice(0, 6).join("、")} 等 ${lessonIds.length} 个课时`;
}

export function ResourcePlanPanel({
  plan,
  requestedResources,
}: {
  plan: CoursePlan;
  requestedResources?: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-secondary text-primary">
            <CheckCircle2 className="size-4" aria-hidden="true" />
          </span>
          后续课程资源规划
        </CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          以下内容仅为资源用途与适用范围规划，具体资源将在后续资源中心单独生成。
        </p>
        {requestedResources && requestedResources.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1" aria-label="计划资源类型">
            {requestedResources.map((resource) => (
              <Badge key={resource} variant="secondary">
                {resourceLabels[resource] ?? resource}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {plan.resourcePlan.map((resource) => {
          const scope = getResourceScope(plan, resource);
          return (
            <div key={resource.resourceType} className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-[#273149]">
                {resourceLabels[resource.resourceType] ?? resource.resourceType}
              </h3>
              <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <p><span className="font-semibold text-[#44506a]">用途：</span>{resource.purpose}</p>
                {scope.phases.length > 0 && (
                  <p><span className="font-semibold text-[#44506a]">关联课程阶段：</span>{scope.phases.join("、")}</p>
                )}
                <p>
                  <span className="font-semibold text-[#44506a]">关联模块：</span>
                  {scope.modules.length > 0 ? scope.modules.join("、") : "课程整体"}
                </p>
                <p><span className="font-semibold text-[#44506a]">适用课时：</span>{formatLessonScope(scope.lessonIds)}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

