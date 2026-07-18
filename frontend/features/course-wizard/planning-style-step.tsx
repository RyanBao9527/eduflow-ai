"use client";

import { useFormContext } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DIFFICULTY_OPTIONS,
  TEACHING_MODE_OPTIONS,
} from "@/features/course-wizard/constants";
import type { CourseBriefFormValues } from "@/features/course-wizard/course-brief-schema";
import { WizardOptionCardGroup } from "@/features/course-wizard/wizard-option-card-group";

export function PlanningStyleStep() {
  const form = useFormContext<CourseBriefFormValues>();

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="teachingStyles"
        render={({ field }) => {
          const selectedStyles = field.value ?? [];
          const selectedMode = selectedStyles.length === 1
            && TEACHING_MODE_OPTIONS.some((option) => option.value === selectedStyles[0])
            ? selectedStyles[0]
            : "";
          const hasLegacyStyles = selectedStyles.length > 0 && !selectedMode;

          return (
            <FormItem className="sm:col-span-2">
              <WizardOptionCardGroup
                label="教学方式"
                description="选择一种主要教学方式；AI 智能规划会结合课程主题和学员画像组织课程。"
                options={TEACHING_MODE_OPTIONS}
                value={selectedMode}
                onChange={(value) => field.onChange([value])}
                allowCustom={false}
              />
              {hasLegacyStyles && (
                <div className="rounded-lg bg-muted/70 p-3" aria-label="已保存的教学风格">
                  <p className="text-xs leading-5 text-muted-foreground">
                    已保留旧草稿中的教学风格。选择上方任一教学方式后将替换这些设置。
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedStyles.map((style) => (
                      <Badge key={style} variant="secondary">{style}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <FormField
        control={form.control}
        name="overallGoal"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>希望学生学会什么？</FormLabel>
            <FormControl>
              <Textarea
                placeholder="例如：掌握 Python 基础语法，并能独立完成一个简单项目。"
                {...field}
              />
            </FormControl>
            <FormDescription>
              已根据课程主题提供可编辑的默认目标，课程结构、活动和评价将围绕它组织。
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="lessonDurationMinutes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>单课时长（分钟）</FormLabel>
            <FormControl>
              <Input
                type="number"
                inputMode="numeric"
                min={10}
                max={480}
                placeholder="例如：45"
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={Number.isFinite(field.value) ? field.value : ""}
                onChange={(event) =>
                  field.onChange(event.target.value === "" ? undefined : Number(event.target.value))
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="lessonCount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>课时数量</FormLabel>
            <FormControl>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                placeholder="例如：2"
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={Number.isFinite(field.value) ? field.value : ""}
                onChange={(event) =>
                  field.onChange(event.target.value === "" ? undefined : Number(event.target.value))
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="difficulty"
        render={({ field }) => (
          <FormItem>
            <FormLabel>课程难度</FormLabel>
            <Select
              onValueChange={(value) => {
                if (value) field.onChange(value);
              }}
              value={field.value ?? ""}
            >
              <FormControl>
                <SelectTrigger aria-label="课程难度">
                  <SelectValue placeholder="请选择课程难度" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

    </div>
  );
}
