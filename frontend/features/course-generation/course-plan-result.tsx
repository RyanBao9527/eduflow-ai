"use client";

import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  Layers3,
  ListChecks,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseGenerationApiError, generateCoursePlan } from "@/features/course-generation/course-generation-api";
import { CourseGenerationError } from "@/features/course-generation/course-generation-error";
import { CourseGenerationLoading } from "@/features/course-generation/course-generation-loading";
import {
  loadCourseGeneration,
  saveCourseGeneration,
} from "@/features/course-generation/course-generation-storage";
import type {
  CoursePlan,
  LessonDetail,
  StoredCourseGeneration,
} from "@/features/course-generation/course-plan-schema";
import { RESOURCE_OPTIONS } from "@/features/course-wizard/constants";

const resourceLabels = Object.fromEntries(
  RESOURCE_OPTIONS.map((resource) => [resource.value, resource.label]),
) as Record<string, string>;

function SectionTitle({ icon: Icon, children }: { icon: typeof Target; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-lg bg-secondary text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span>{children}</span>
    </div>
  );
}

export function CoursePlanResult() {
  const router = useRouter();
  const [stored, setStored] = useState<StoredCourseGeneration | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<CourseGenerationApiError | null>(null);

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (!active) return;
      const generation = loadCourseGeneration(window.sessionStorage);
      if (!generation) {
        router.replace("/courses/new?result=missing");
        return;
      }
      setStored(generation);
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  const handleRegenerate = async () => {
    if (!stored || regenerating) return;
    const confirmed = window.confirm("重新生成会发起一次新的 AI 调用，并替换当前标签页中的课程蓝图。确定继续吗？");
    if (!confirmed) return;
    setRegenerating(true);
    setError(null);
    try {
      const response = await generateCoursePlan(stored.brief);
      saveCourseGeneration(window.sessionStorage, stored.brief, response);
      setStored(loadCourseGeneration(window.sessionStorage));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(
        caught instanceof CourseGenerationApiError
          ? caught
          : new CourseGenerationApiError("课程蓝图生成失败，请重试。"),
      );
    } finally {
      setRegenerating(false);
    }
  };

  if (!hydrated || !stored) {
    return (
      <Card>
        <CardContent className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">
          正在恢复课程蓝图…
        </CardContent>
      </Card>
    );
  }

  if (regenerating) return <CourseGenerationLoading lessonCount={stored.brief.lessonCount} />;

  const { coursePlan: plan, generation } = stored.response;
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-[#dce4fb] bg-[#eef3ff] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white text-primary">课程蓝图已生成</Badge>
              <Badge variant="outline">
                {plan.detailMode === "detailed" ? "完整蓝图" : "平衡蓝图"}
              </Badge>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-[-0.03em] text-[#172033] sm:text-3xl">
              {plan.title}
            </h1>
            <p className="mt-3 text-base font-medium leading-7 text-[#35415b]">{plan.positioning}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5a6680]">{plan.overview}</p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#59657e]">
              <span className="flex items-center gap-1.5"><BookOpen className="size-3.5" />{stored.brief.lessonCount} 课时</span>
              <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" />每课 {stored.brief.lessonDurationMinutes} 分钟</span>
              <span className="flex items-center gap-1.5"><Sparkles className="size-3.5" />{generation.provider} · {generation.model}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push("/courses/new")}>
              <ArrowLeft className="size-4" />修改需求
            </Button>
            <Button onClick={handleRegenerate}>
              <RefreshCw className="size-4" />重新生成
            </Button>
          </div>
        </div>
      </section>

      {error && <CourseGenerationError error={error} onRetry={handleRegenerate} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle><SectionTitle icon={Users}>学员分析</SectionTitle></CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm leading-6">
            <p>{plan.audienceAnalysis.profile}</p>
            <TagList title="已有基础" items={plan.audienceAnalysis.prerequisites} />
            <TagList title="学习需要" items={plan.audienceAnalysis.learningNeeds} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle><SectionTitle icon={Target}>学习目标</SectionTitle></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {plan.learningObjectives.map((objective) => (
              <div key={objective.objectiveId} className="rounded-xl bg-muted/70 p-4">
                <p className="text-sm font-semibold text-[#273149]">{objective.statement}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">达成证据：{objective.evidence}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle><SectionTitle icon={Layers3}>课程模块</SectionTitle></CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {plan.modules.map((module) => (
            <div key={module.moduleId} className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-[#273149]">{module.title}</h3>
                <Badge variant="outline">{module.moduleId}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{module.goal}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {module.keyConcepts.map((concept) => <Badge key={concept} variant="secondary">{concept}</Badge>)}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">课时：{module.lessonIds.join("、")}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {plan.detailMode === "balanced" && <CoursePhases plan={plan} />}

      <LessonPlanSections plan={plan} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle><SectionTitle icon={Sparkles}>教学策略</SectionTitle></CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm leading-6">
            <p>{plan.teachingStrategy.approach}</p>
            <p className="text-muted-foreground">学员参与：{plan.teachingStrategy.learnerEngagement}</p>
            <TagList title="差异化建议" items={plan.teachingStrategy.differentiation} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle><SectionTitle icon={ListChecks}>评估方案</SectionTitle></CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm leading-6">
            <PlanLine label="诊断性评估" value={plan.assessmentPlan.diagnostic} />
            <PlanLine label="形成性评估" value={plan.assessmentPlan.formative} />
            <PlanLine label="总结性评估" value={plan.assessmentPlan.summative} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle><SectionTitle icon={CheckCircle2}>资源规划</SectionTitle></CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {plan.resourcePlan.map((resource) => (
            <div key={resource.resourceType} className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-[#273149]">{resourceLabels[resource.resourceType] ?? resource.resourceType}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{resource.purpose}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                范围：{[...resource.moduleIds, ...resource.lessonIds].join("、")}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {(plan.assumptions.length > 0 || plan.qualityChecklist.length > 0) && (
        <Alert>
          <AlertTitle>生成说明与质量检查</AlertTitle>
          <AlertDescription>
            {plan.assumptions.length > 0 && <p>合理假设：{plan.assumptions.join("；")}</p>}
            <p className="mt-1">检查项：{plan.qualityChecklist.join("；")}</p>
          </AlertDescription>
        </Alert>
      )}

      <p className="text-center text-xs text-muted-foreground">
        生成于 {formatDate(generation.generatedAt)} · 共使用 {generation.usage.totalTokens.toLocaleString("zh-CN")} Tokens
        {generation.usage.estimatedCostUsd != null && ` · 估算 $${generation.usage.estimatedCostUsd.toFixed(6)}`}
      </p>
    </div>
  );
}

function CoursePhases({ plan }: { plan: Extract<CoursePlan, { detailMode: "balanced" }> }) {
  return (
    <Card>
      <CardHeader><CardTitle><SectionTitle icon={Layers3}>课程阶段</SectionTitle></CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plan.phases.map((phase) => (
          <div key={phase.phaseId} className="rounded-xl bg-muted/70 p-4">
            <Badge variant="outline">{phase.phaseId}</Badge>
            <h3 className="mt-3 font-semibold text-[#273149]">{phase.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{phase.goal}</p>
            <p className="mt-3 text-xs font-medium text-primary">里程碑：{phase.milestone}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function LessonPlanSections({ plan }: { plan: CoursePlan }) {
  const details = plan.detailMode === "detailed" ? plan.lessonDetails : plan.keyLessonDetails;
  const detailMap = useMemo(() => new Map(details.map((detail) => [detail.lessonId, detail])), [details]);
  return (
    <Card>
      <CardHeader>
        <CardTitle><SectionTitle icon={BookOpen}>课时结构</SectionTitle></CardTitle>
        {plan.detailMode === "balanced" && (
          <p className="text-sm text-muted-foreground">完整索引已生成；当前仅展开关键课时，其他课时将在后续支持按需生成。</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {plan.lessonIndex.map((lesson) => (
          <details key={lesson.lessonId} className="group rounded-xl border bg-white p-4" open={plan.lessonIndex.length <= 3}>
            <summary className="cursor-pointer list-none">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{lesson.lessonId}</Badge>
                    <span className="text-xs text-muted-foreground">{lesson.durationMinutes} 分钟</span>
                    {detailMap.has(lesson.lessonId) && <Badge variant="secondary">关键详情</Badge>}
                  </div>
                  <h3 className="mt-2 font-semibold text-[#273149]">第 {lesson.lessonNumber} 课 · {lesson.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{lesson.objective}</p>
                </div>
              </div>
            </summary>
            <div className="mt-4 border-t pt-4">
              <TagList title="核心知识点" items={lesson.keyConcepts} />
              {detailMap.get(lesson.lessonId) && <LessonDetailView detail={detailMap.get(lesson.lessonId)!} />}
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}

function LessonDetailView({ detail }: { detail: LessonDetail }) {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div>
        <p className="text-xs font-semibold text-muted-foreground">教学活动</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6">
          {detail.teachingActivities.map((activity) => <li key={activity}>{activity}</li>)}
        </ol>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground">评估方式</p>
        <p className="mt-2 text-sm leading-6">{detail.assessmentMethod}</p>
        {detail.resourceRefs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {detail.resourceRefs.map((resource) => <Badge key={resource} variant="outline">{resourceLabels[resource] ?? resource}</Badge>)}
          </div>
        )}
      </div>
    </div>
  );
}

function TagList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">{items.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}</div>
    </div>
  );
}

function PlanLine({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-1">{value}</p></div>;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
