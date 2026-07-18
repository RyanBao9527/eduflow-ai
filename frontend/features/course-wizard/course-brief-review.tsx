"use client";

import {
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Pencil,
  Sparkles,
  Target,
} from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DIFFICULTY_OPTIONS,
  getOptionLabel,
  RESOURCE_OPTIONS,
  TEACHING_SCENARIOS,
} from "@/features/course-wizard/constants";
import type { CourseBriefFormValues } from "@/features/course-wizard/course-brief-schema";

function EditButton({ label, step, onEdit }: { label: string; step: number; onEdit: (step: number) => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={`修改${label}`}
      onClick={() => onEdit(step)}
    >
      <Pencil className="size-3.5" />
      返回修改
    </Button>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  step,
  onEdit,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value?: React.ReactNode;
  step: number;
  onEdit: (step: number) => void;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f2f5ff] text-primary">
            <Icon className="size-[18px]" aria-hidden={true} />
          </span>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </h3>
            {value && <div className="mt-1 break-words text-sm font-semibold leading-6 text-[#273149]">{value}</div>}
          </div>
        </div>
        <EditButton label={label} step={step} onEdit={onEdit} />
      </div>
      {children}
    </section>
  );
}

export function CourseBriefReview({ onEdit }: { onEdit: (step: number) => void }) {
  const { control } = useFormContext<CourseBriefFormValues>();
  const values = useWatch({ control });
  const selectedResourceLabels = RESOURCE_OPTIONS.filter(
    (resource) => resource.value !== "course_plan" && values.requestedResources?.includes(resource.value),
  ).map((resource) => resource.label);

  const learnerProfile = [values.targetLearners, values.ageOrGrade, values.learnerLevel]
    .filter(Boolean)
    .join(" · ");
  const lessonPlan = values.lessonCount && values.lessonDurationMinutes
    ? `${values.lessonCount} 课时 × ${values.lessonDurationMinutes} 分钟`
    : "待完善";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-[#f2f5ff] to-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">准备就绪</p>
            <h2 className="mt-1 text-lg font-bold text-[#273149]">确认后即可创建 AI 课程</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              我们会根据以下信息生成可继续编辑和扩展的课程蓝图。
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryCard
          icon={BookOpenCheck}
          label="课程名称"
          value={values.courseTitle || "待完善"}
          step={1}
          onEdit={onEdit}
        >
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {[values.subject, values.topic].filter(Boolean).join(" · ") || "学科与主题待完善"}
          </p>
        </SummaryCard>

        <SummaryCard
          icon={GraduationCap}
          label="学员画像"
          value={learnerProfile || "待完善"}
          step={2}
          onEdit={onEdit}
        >
          {values.classSize && (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">预计班级人数：{values.classSize} 人</p>
          )}
        </SummaryCard>

        <SummaryCard
          icon={Target}
          label="课程目标"
          value={values.overallGoal || "待完善"}
          step={3}
          onEdit={onEdit}
        />

        <SummaryCard
          icon={Clock3}
          label="课时规划"
          value={lessonPlan}
          step={3}
          onEdit={onEdit}
        >
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {getOptionLabel(DIFFICULTY_OPTIONS, values.difficulty)} · {getOptionLabel(TEACHING_SCENARIOS, values.teachingScenario)}
          </p>
        </SummaryCard>

        <SummaryCard
          icon={Sparkles}
          label="教学方式"
          step={3}
          onEdit={onEdit}
        >
          <div className="mt-3 flex flex-wrap gap-2">
            {values.teachingStyles?.length ? values.teachingStyles.map((style) => (
              <Badge key={style} variant="secondary">{style}</Badge>
            )) : <span className="text-sm text-muted-foreground">待完善</span>}
          </div>
        </SummaryCard>

        <SummaryCard
          icon={BookOpenCheck}
          label="资源方案"
          step={4}
          onEdit={onEdit}
        >
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">课程蓝图</Badge>
            <Badge variant="secondary">教学大纲与课程规划</Badge>
            {selectedResourceLabels.map((resource) => (
              <Badge key={resource} variant="outline">{resource}</Badge>
            ))}
          </div>
        </SummaryCard>
      </div>

      <section aria-labelledby="ai-output-title" className="rounded-xl border bg-white p-5">
        <h3 id="ai-output-title" className="text-sm font-bold text-[#273149]">AI 生成内容</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {["课程蓝图", "教学方案", "资源规划"].map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              {item}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          本次创建不会生成 PPT、教案或练习正文；所选高级资源将进入后续资源规划。
        </p>
      </section>
    </div>
  );
}
