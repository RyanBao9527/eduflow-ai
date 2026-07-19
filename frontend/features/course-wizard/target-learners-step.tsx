"use client";

import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import {
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { CourseBriefFormValues } from "@/features/course-wizard/course-brief-schema";
import {
  ADULT_EDUCATION_STAGE_OPTIONS,
  EDUCATION_STAGE_OPTIONS,
  LEARNER_LEVEL_OPTIONS,
  LEARNER_TYPE_OPTIONS,
} from "@/features/course-wizard/constants";
import { WizardOptionCardGroup } from "@/features/course-wizard/wizard-option-card-group";

export type LearnerFieldOrigin = "user" | "draft" | "default" | "unset";

const ADULT_LEARNER_TYPES = new Set(["教师", "企业员工", "职场人士"]);

export function TargetLearnersStep({
  ageOrGradeOrigin,
  onAgeOrGradeOriginChange,
}: {
  ageOrGradeOrigin: LearnerFieldOrigin;
  onAgeOrGradeOriginChange: (origin: LearnerFieldOrigin) => void;
}) {
  const form = useFormContext<CourseBriefFormValues>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasSettingsError = Boolean(form.formState.errors.classSize);
  const targetLearners = useWatch({ control: form.control, name: "targetLearners" });
  const isAdultLearner = ADULT_LEARNER_TYPES.has(targetLearners ?? "");
  const educationStageOptions = isAdultLearner
    ? ADULT_EDUCATION_STAGE_OPTIONS
    : EDUCATION_STAGE_OPTIONS;

  const fillAdultStageIfAllowed = () => {
    if (ageOrGradeOrigin !== "unset" || form.getValues("ageOrGrade")?.trim()) return;
    form.setValue("ageOrGrade", "成人", {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false,
    });
    onAgeOrGradeOriginChange("default");
  };

  useEffect(() => {
    if (isAdultLearner) fillAdultStageIfAllowed();
  // The initial adult-learning profile may come from a restored draft.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdultLearner]);

  return (
    <div className="space-y-7">
      <FormField
        control={form.control}
        name="targetLearners"
        render={({ field }) => (
          <FormItem>
            <WizardOptionCardGroup
              label="主要学习者"
              description="谁会参加这门课程？"
              options={LEARNER_TYPE_OPTIONS}
              value={field.value ?? ""}
              onChange={(value) => {
                field.onChange(value);
                if (ADULT_LEARNER_TYPES.has(value)) fillAdultStageIfAllowed();
              }}
              customPlaceholder="例如：新任管理者、家长、技术团队"
              customOptionLabel="其他，请说明"
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="ageOrGrade"
        render={({ field }) => (
          <FormItem>
            <WizardOptionCardGroup
              label="年龄/学习阶段"
              description="他们通常处于哪个学习阶段？"
              options={educationStageOptions}
              value={field.value ?? ""}
              onChange={(value) => {
                onAgeOrGradeOriginChange("user");
                field.onChange(value);
              }}
              customPlaceholder="例如：8-10岁、小学高年级、大学阶段"
              customOptionLabel="其他，请说明"
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="learnerLevel"
        render={({ field }) => (
          <FormItem>
            <WizardOptionCardGroup
              label="学习基础"
              description="他们开始学习前具备什么基础？"
              options={LEARNER_LEVEL_OPTIONS}
              value={field.value ?? ""}
              onChange={field.onChange}
              customPlaceholder="例如：已掌握基础知识、有项目实践经验"
              customOptionLabel="其他，请说明"
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <details
        className="rounded-xl border bg-muted/25"
        open={settingsOpen || hasSettingsError}
        onToggle={(event) => setSettingsOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[#273149] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset">
          更多设置
          <span className="ml-2 text-xs font-normal text-muted-foreground">班级人数</span>
        </summary>
        <div className="border-t p-4">
          <FormField
            control={form.control}
            name="classSize"
            render={({ field }) => (
              <FormItem className="max-w-sm">
                <label htmlFor="class-size" className="text-sm font-medium">班级人数（可选）</label>
                <Input
                  id="class-size"
                  className="mt-2"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  placeholder="例如：30"
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value ?? ""}
                  onChange={(event) =>
                    field.onChange(event.target.value === "" ? undefined : Number(event.target.value))
                  }
                />
                <p className="text-sm text-muted-foreground">用于后续设计课堂活动规模。</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </details>
    </div>
  );
}
