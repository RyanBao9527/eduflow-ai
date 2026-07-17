"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  TEACHING_STYLE_OPTIONS,
} from "@/features/course-wizard/constants";
import type { CourseBriefFormValues } from "@/features/course-wizard/course-brief-schema";

export function PlanningStyleStep() {
  const form = useFormContext<CourseBriefFormValues>();
  const [customStyle, setCustomStyle] = useState("");

  return (
    <div className="grid gap-6 sm:grid-cols-2">
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
            <Select onValueChange={field.onChange} value={field.value ?? ""}>
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

      <FormField
        control={form.control}
        name="overallGoal"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>课程总体目标</FormLabel>
            <FormControl>
              <Textarea
                placeholder="描述课程结束后，学员应该理解什么、掌握什么或能够完成什么。"
                {...field}
              />
            </FormControl>
            <FormDescription>后续课程结构、活动和评价都将围绕该目标组织。</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="teachingStyles"
        render={({ field }) => {
          const selectedStyles = field.value ?? [];
          const customStyles = selectedStyles.filter(
            (style) => !TEACHING_STYLE_OPTIONS.includes(style as (typeof TEACHING_STYLE_OPTIONS)[number]),
          );

          const toggleStyle = (style: string, checked: boolean) => {
            field.onChange(
              checked
                ? [...selectedStyles, style]
                : selectedStyles.filter((value) => value !== style),
            );
          };

          const addCustomStyle = () => {
            const value = customStyle.trim();
            if (!value || selectedStyles.includes(value) || selectedStyles.length >= 5) return;
            field.onChange([...selectedStyles, value]);
            setCustomStyle("");
          };

          return (
            <FormItem className="sm:col-span-2">
              <FormLabel>教学风格</FormLabel>
              <FormDescription>至少选择一种，最多五种。</FormDescription>
              <div className="grid gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-3">
                {TEACHING_STYLE_OPTIONS.map((style) => {
                  const checked = selectedStyles.includes(style);
                  return (
                    <label
                      key={style}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-white px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted has-[[data-state=checked]]:border-primary/35 has-[[data-state=checked]]:bg-[#f2f5ff]"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleStyle(style, value === true)}
                        aria-label={style}
                      />
                      {style}
                    </label>
                  );
                })}
              </div>

              {customStyles.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2" aria-label="自定义教学风格">
                  {customStyles.map((style) => (
                    <span
                      key={style}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
                    >
                      {style}
                      <button
                        type="button"
                        onClick={() => toggleStyle(style, false)}
                        aria-label={`移除教学风格：${style}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Input
                  value={customStyle}
                  onChange={(event) => setCustomStyle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomStyle();
                    }
                  }}
                  maxLength={40}
                  placeholder="添加自定义教学风格"
                  aria-label="自定义教学风格"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomStyle}
                  disabled={!customStyle.trim() || selectedStyles.length >= 5}
                >
                  <Plus className="size-4" />
                  添加
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    </div>
  );
}
