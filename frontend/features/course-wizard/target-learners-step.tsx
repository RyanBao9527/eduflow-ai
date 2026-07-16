"use client";

import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CourseBriefFormValues } from "@/features/course-wizard/course-brief-schema";

export function TargetLearnersStep() {
  const form = useFormContext<CourseBriefFormValues>();

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="targetLearners"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>目标学员</FormLabel>
            <FormControl>
              <Textarea
                placeholder="例如：小学三年级学生，已经掌握整数四则运算。"
                {...field}
              />
            </FormControl>
            <FormDescription>说明学员群体及与本课程相关的典型特征。</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="ageOrGrade"
        render={({ field }) => (
          <FormItem>
            <FormLabel>年龄或年级</FormLabel>
            <FormControl>
              <Input placeholder="例如：三年级 / 10–12 岁" autoComplete="off" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="learnerLevel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>学员基础</FormLabel>
            <FormControl>
              <Input placeholder="例如：零基础 / 有基础" autoComplete="off" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="classSize"
        render={({ field }) => (
          <FormItem>
            <FormLabel>班级人数（可选）</FormLabel>
            <FormControl>
              <Input
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
            </FormControl>
            <FormDescription>用于后续设计课堂活动规模。</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
