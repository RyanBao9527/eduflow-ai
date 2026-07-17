"use client";

import { Pencil } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DIFFICULTY_OPTIONS,
  getOptionLabel,
  RESOURCE_OPTIONS,
  TEACHING_SCENARIOS,
} from "@/features/course-wizard/constants";
import type { CourseBriefFormValues } from "@/features/course-wizard/course-brief-schema";

function ReviewSection({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-bold text-[#273149]">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(step)}>
          <Pencil className="size-3.5" />
          返回修改
        </Button>
      </div>
      <Separator className="my-4" />
      {children}
    </section>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium leading-6 text-[#273149]">{children || "未填写"}</dd>
    </div>
  );
}

export function CourseBriefReview({ onEdit }: { onEdit: (step: number) => void }) {
  const { control } = useFormContext<CourseBriefFormValues>();
  const values = useWatch({ control });
  const selectedResourceLabels = RESOURCE_OPTIONS.filter((resource) =>
    values.requestedResources?.includes(resource.value),
  ).map((resource) => resource.label);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ReviewSection title="课程信息" step={1} onEdit={onEdit}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="课程名称">{values.courseTitle}</Detail>
          <Detail label="学科或领域">{values.subject}</Detail>
          <Detail label="课程主题">{values.topic}</Detail>
          <Detail label="教学场景">
            {getOptionLabel(TEACHING_SCENARIOS, values.teachingScenario)}
          </Detail>
          <div className="sm:col-span-2">
            <Detail label="课程描述">{values.description || "未填写"}</Detail>
          </div>
        </dl>
      </ReviewSection>

      <ReviewSection title="目标学员" step={2} onEdit={onEdit}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Detail label="目标学员">{values.targetLearners}</Detail>
          </div>
          <Detail label="年龄或年级">{values.ageOrGrade}</Detail>
          <Detail label="学员基础">{values.learnerLevel}</Detail>
          <Detail label="班级人数">
            {values.classSize ? `${values.classSize} 人` : "未填写"}
          </Detail>
        </dl>
      </ReviewSection>

      <ReviewSection title="课程规划与教学风格" step={3} onEdit={onEdit}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="课程安排">
            {values.lessonCount && values.lessonDurationMinutes
              ? `${values.lessonCount} 课时 × ${values.lessonDurationMinutes} 分钟`
              : "未填写"}
          </Detail>
          <Detail label="课程难度">
            {getOptionLabel(DIFFICULTY_OPTIONS, values.difficulty)}
          </Detail>
          <div className="sm:col-span-2">
            <Detail label="课程总体目标">{values.overallGoal}</Detail>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-muted-foreground">教学风格</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {values.teachingStyles?.map((style) => (
                <Badge key={style} variant="secondary">{style}</Badge>
              ))}
            </dd>
          </div>
        </dl>
      </ReviewSection>

      <ReviewSection title="资源规划与额外要求" step={4} onEdit={onEdit}>
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">后续课程资源规划</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {selectedResourceLabels.map((resource) => (
                <Badge key={resource} variant="outline">{resource}</Badge>
              ))}
            </dd>
          </div>
          <Detail label="额外要求">{values.extraRequirements || "未填写"}</Detail>
        </dl>
      </ReviewSection>
    </div>
  );
}
