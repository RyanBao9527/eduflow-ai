"use client";

import { ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getReadyResourceArtifact } from "@/features/course-resources/resource-artifact-storage";
import type { CoursePlan } from "@/features/course-generation/course-plan-schema";

type Lesson = CoursePlan["lessonIndex"][number];

function hasReadyResource(
  projectId: string,
  lessonId: string,
  resourceType: "lesson_plan" | "slide_outline",
) {
  if (typeof window === "undefined") return false;
  return Boolean(
    getReadyResourceArtifact(window.localStorage, {
      courseProjectId: projectId,
      lessonId,
      resourceType,
    }),
  );
}

function ResourceStatus({ label, ready }: { label: string; ready: boolean }) {
  return (
    <Badge variant={ready ? "secondary" : "outline"}>
      {ready ? (
        <CheckCircle2 className="mr-1 size-3.5 text-emerald-700" aria-hidden="true" />
      ) : (
        <CircleDashed className="mr-1 size-3.5 text-muted-foreground" aria-hidden="true" />
      )}
      {label} · {ready ? "已生成" : "未生成"}
    </Badge>
  );
}

export function LessonSummaryCard({
  lesson,
  moduleTitle,
  projectId,
  isEditing,
  onLessonChange,
}: {
  lesson: Lesson;
  moduleTitle: string;
  projectId: string;
  isEditing: boolean;
  onLessonChange: (lessonId: string, field: "title" | "objective", value: string) => void;
}) {
  const lessonPlanReady = hasReadyResource(projectId, lesson.lessonId, "lesson_plan");
  const slideOutlineReady = hasReadyResource(projectId, lesson.lessonId, "slide_outline");

  return (
    <section
      aria-label={`${lesson.lessonId} 课时摘要`}
      className="rounded-xl border bg-white p-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">第 {lesson.lessonNumber} 课</Badge>
            <span className="text-xs text-muted-foreground">
              {moduleTitle} · {lesson.moduleId} · {lesson.durationMinutes} 分钟
            </span>
          </div>

          {isEditing ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <Label htmlFor={`lesson-title-${lesson.lessonId}`}>课时标题</Label>
                <Input
                  id={`lesson-title-${lesson.lessonId}`}
                  className="mt-2"
                  value={lesson.title}
                  onChange={(event) =>
                    onLessonChange(lesson.lessonId, "title", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`lesson-description-${lesson.lessonId}`}>课时描述</Label>
                <Textarea
                  id={`lesson-description-${lesson.lessonId}`}
                  className="mt-2 min-h-20"
                  value={lesson.objective}
                  onChange={(event) =>
                    onLessonChange(lesson.lessonId, "objective", event.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <h3 className="font-semibold text-[#273149]">{lesson.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                <span className="font-medium text-[#44506a]">教学目标：</span>
                {lesson.objective}
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2" aria-label={`${lesson.lessonId} 资源状态`}>
            <ResourceStatus label="教师教案" ready={lessonPlanReady} />
            <ResourceStatus label="PPT结构" ready={slideOutlineReady} />
          </div>
        </div>

        <div className="shrink-0 lg:pt-1">
          {isEditing ? (
            <Button type="button" disabled>
              进入备课
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button asChild>
              <Link href={`/courses/${projectId}/lessons/${lesson.lessonId}`}>
                进入备课
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
