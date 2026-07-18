"use client";

import { AlertCircle, ArrowLeft, LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { courseBriefSchema } from "@/features/course-wizard/course-brief-schema";
import { LessonOverview } from "@/features/lesson-workspace/lesson-overview";
import { LessonResourceArea } from "@/features/lesson-workspace/lesson-resource-area";
import { useCourseProject } from "@/features/course-workspace/use-course-project";

function WorkspaceError({
  title,
  message,
  projectId,
}: {
  title: string;
  message: string;
  projectId: string;
}) {
  return (
    <div className="min-w-0 flex-1 p-5 sm:p-8">
      <Card>
        <CardContent className="flex min-h-[420px] flex-col items-center justify-center text-center">
          <AlertCircle className="size-10 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-[#273149]">{title}</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href={`/courses/${projectId}`}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                返回课程
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <LayoutDashboard className="size-4" aria-hidden="true" />
                返回 Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function LessonWorkspace({
  projectId,
  lessonId,
}: {
  projectId: string;
  lessonId: string;
}) {
  const { project, hydrated } = useCourseProject(projectId);

  if (!hydrated) {
    return (
      <div className="min-w-0 flex-1 p-5 sm:p-8">
        <Card>
          <CardContent className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">
            正在加载课时工作台…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <WorkspaceError
        title="课程项目不可用"
        message="找不到对应课程项目，本地数据可能已经被清理。"
        projectId={projectId}
      />
    );
  }

  if (project.status === "draft") {
    return (
      <WorkspaceError
        title="课程尚未完成，无法进入备课"
        message="请先完成课程蓝图生成并保存为课程项目。"
        projectId={projectId}
      />
    );
  }

  if (!project.coursePlan || !project.generation) {
    return (
      <WorkspaceError
        title="课程项目不可用"
        message="课程蓝图或生成信息不完整，暂时无法打开课时工作台。"
        projectId={projectId}
      />
    );
  }

  const parsedCourseBrief = courseBriefSchema.safeParse(project.courseBrief);
  if (!parsedCourseBrief.success) {
    return (
      <WorkspaceError
        title="课程项目不可用"
        message="课程需求信息不完整，暂时无法生成单课教学资源。"
        projectId={projectId}
      />
    );
  }

  const lesson = project.coursePlan.lessonIndex.find((item) => item.lessonId === lessonId);
  if (!lesson) {
    return (
      <WorkspaceError
        title="课时不存在"
        message="该课时不属于当前课程，或课程结构已经发生变化。"
        projectId={projectId}
      />
    );
  }

  const courseModule = project.coursePlan.modules.find((item) => item.moduleId === lesson.moduleId);
  if (!courseModule || !courseModule.lessonIds.includes(lesson.lessonId)) {
    return (
      <WorkspaceError
        title="课时数据不可用"
        message="课时与课程模块的关联信息不完整。"
        projectId={projectId}
      />
    );
  }

  const statusLabel = project.status === "generated" ? "已生成" : "已编辑";

  return (
    <div className="min-w-0 flex-1">
      <header className="border-b bg-white px-5 py-5 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">
              {project.title} <span aria-hidden="true">›</span> 第 {lesson.lessonNumber} 课
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-[#273149] sm:text-2xl">{lesson.title}</h1>
              <Badge variant="secondary">{statusLabel}</Badge>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href={`/courses/${project.id}`}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              返回课程
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <LessonOverview lesson={lesson} courseModule={courseModule} />
        <LessonResourceArea
          projectId={project.id}
          courseBrief={parsedCourseBrief.data}
          coursePlan={project.coursePlan}
          projectUpdatedAt={project.updatedAt}
          moduleId={courseModule.moduleId}
          lessonId={lesson.lessonId}
        />
      </main>
    </div>
  );
}
