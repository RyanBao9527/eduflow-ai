"use client";

import { AlertCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { courseBriefSchema } from "@/features/course-wizard/course-brief-schema";
import { CourseHeader } from "@/features/course-workspace/course-header";
import { CourseInfoEditor } from "@/features/course-workspace/course-info-editor";
import type { CourseProject } from "@/features/course-workspace/course-project-schema";
import { saveEditedCourseProject } from "@/features/course-workspace/course-project-storage";
import { LessonList } from "@/features/course-workspace/lesson-list";
import { ModuleEditor } from "@/features/course-workspace/module-editor";
import { ResourcePlanPanel } from "@/features/course-workspace/resource-plan-panel";
import type { WorkspaceSaveState } from "@/features/course-workspace/save-indicator";
import { useCourseProject } from "@/features/course-workspace/use-course-project";

const editableProjectSchema = z.object({
  title: z.string().trim().min(2, "课程标题至少需要 2 个字符").max(80, "课程标题不能超过 80 个字符"),
  overallGoal: z.string().trim().min(5, "课程总体目标至少需要 5 个字符").max(1000, "课程总体目标不能超过 1000 个字符"),
  modules: z.array(z.object({ id: z.string(), title: z.string().trim().min(2).max(100) })),
  lessons: z.array(z.object({
    id: z.string(),
    title: z.string().trim().min(2, "课时标题至少需要 2 个字符").max(100),
    objective: z.string().trim().min(2, "课时描述至少需要 2 个字符").max(180),
  })),
});

function cloneProject(project: CourseProject) {
  return structuredClone(project);
}

export function CourseWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { project, setProject, hydrated } = useCourseProject(projectId);
  const [draft, setDraft] = useState<CourseProject | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<WorkspaceSaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(
    () => Boolean(project && draft && JSON.stringify(project) !== JSON.stringify(draft)),
    [draft, project],
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const active = draft ?? project;
  const savedBrief = project ? courseBriefSchema.safeParse(project.courseBrief) : null;

  const navigateBack = () => {
    if (dirty && !window.confirm("当前修改尚未保存，确定返回 Dashboard 吗？")) return;
    router.push("/dashboard");
  };

  const beginEdit = () => {
    if (!project) return;
    setDraft(cloneProject(project));
    setIsEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    if (dirty && !window.confirm("确定放弃尚未保存的修改吗？")) return;
    setDraft(null);
    setIsEditing(false);
    setSaveState("idle");
    setError(null);
  };

  const save = () => {
    if (!draft?.coursePlan) return;
    const parsedBrief = courseBriefSchema.safeParse(draft.courseBrief);
    const parsed = editableProjectSchema.safeParse({
      title: draft.title,
      overallGoal: draft.courseBrief.overallGoal,
      modules: draft.coursePlan.modules.map((module) => ({ id: module.moduleId, title: module.title })),
      lessons: draft.coursePlan.lessonIndex.map((lesson) => ({
        id: lesson.lessonId,
        title: lesson.title,
        objective: lesson.objective,
      })),
    });
    if (!parsed.success || !parsedBrief.success) {
      setError(parsed.error?.issues[0]?.message ?? "请检查课程编辑内容");
      return;
    }

    setSaveState("saving");
    try {
      const normalized: CourseProject = {
        ...draft,
        title: parsed.data.title,
        courseBrief: { ...parsedBrief.data, overallGoal: parsed.data.overallGoal },
        coursePlan: {
          ...draft.coursePlan,
          modules: draft.coursePlan.modules.map((module) => ({
            ...module,
            title: parsed.data.modules.find((item) => item.id === module.moduleId)!.title,
          })),
          lessonIndex: draft.coursePlan.lessonIndex.map((lesson) => {
            const edited = parsed.data.lessons.find((item) => item.id === lesson.lessonId)!;
            return { ...lesson, title: edited.title, objective: edited.objective };
          }),
        },
      };
      const saved = saveEditedCourseProject(window.localStorage, normalized);
      setProject(saved);
      setDraft(null);
      setIsEditing(false);
      setSaveState("saved");
      setError(null);
    } catch {
      setSaveState("error");
      setError("课程项目保存失败，请检查浏览器存储空间后重试。");
    }
  };

  const updateDraft = (updater: (value: CourseProject) => CourseProject) => {
    setDraft((current) => current ? updater(current) : current);
    setSaveState("dirty");
  };

  if (!hydrated) {
    return <Card><CardContent className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">正在加载课程项目…</CardContent></Card>;
  }

  if (
    !active?.coursePlan ||
    !active.generation ||
    active.status === "draft" ||
    !savedBrief?.success
  ) {
    return (
      <Card>
        <CardContent className="flex min-h-[420px] flex-col items-center justify-center text-center">
          <AlertCircle className="size-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">课程项目不可用</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">项目不存在、尚未正式保存或本地数据已经损坏。</p>
          <div className="mt-5 flex gap-2"><Button onClick={() => router.push("/dashboard")}>返回 Dashboard</Button><Button variant="outline" onClick={() => router.push("/courses/new")}>新建课程</Button></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <CourseHeader
        title={active.title}
        status={active.status}
        isEditing={isEditing}
        saveState={saveState}
        onBack={navigateBack}
        onEdit={beginEdit}
        onSave={save}
        onCancel={cancelEdit}
      />
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        {error && <Alert className="border-red-200 bg-red-50 text-red-900"><AlertCircle className="size-4" /><AlertTitle>无法保存修改</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        <CourseInfoEditor
          project={active}
          isEditing={isEditing}
          onTitleChange={(title) => updateDraft((value) => ({ ...value, title }))}
          onGoalChange={(overallGoal) => updateDraft((value) => ({ ...value, courseBrief: { ...value.courseBrief, overallGoal } }))}
        />
        <ModuleEditor
          plan={active.coursePlan}
          isEditing={isEditing}
          onTitleChange={(moduleId, title) => updateDraft((value) => ({
            ...value,
            coursePlan: value.coursePlan ? {
              ...value.coursePlan,
              modules: value.coursePlan.modules.map((module) => module.moduleId === moduleId ? { ...module, title } : module),
            } : null,
          }))}
        />
        <LessonList
          plan={active.coursePlan}
          projectId={active.id}
          isEditing={isEditing}
          onLessonChange={(lessonId, field, fieldValue) => updateDraft((value) => ({
            ...value,
            coursePlan: value.coursePlan ? {
              ...value.coursePlan,
              lessonIndex: value.coursePlan.lessonIndex.map((lesson) => lesson.lessonId === lessonId ? { ...lesson, [field]: fieldValue } : lesson),
            } : null,
          }))}
        />
        <ResourcePlanPanel plan={active.coursePlan} requestedResources={active.courseBrief.requestedResources} />
        <div className="rounded-xl border bg-white p-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-2 font-semibold text-[#44506a]"><Sparkles className="size-3.5" />AI 生成信息</p>
          <p className="mt-2">{active.generation.provider} · {active.generation.model} · {active.generation.promptVersion}</p>
          <p className="mt-1">生成于 {new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(active.generation.generatedAt))}</p>
        </div>
      </main>
    </div>
  );
}
