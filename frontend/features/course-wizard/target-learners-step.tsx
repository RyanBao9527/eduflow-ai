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
            <FormLabel>学员类型</FormLabel>
            <FormControl>
              <Textarea
                placeholder="例如：小学生 / 大学生 / 教师 / 企业员工 / 职场人士"
                {...field}
              />
            </FormControl>
            <FormDescription>描述课程面向的人群。</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="ageOrGrade"
        render={({ field }) => (
          <FormItem>
            <FormLabel>年龄/教育阶段</FormLabel>
            <FormControl>
              <Input
                placeholder="例如：8-10岁 / 小学高年级 / 初中阶段 / 成人"
                autoComplete="off"
                {...field}
              />
            </FormControl>
            <FormDescription>填写适用的年龄范围、年级或教育阶段。</FormDescription>
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
              <Input
                placeholder="例如：零基础 / 有相关学习经验 / 已掌握基础知识 / 有项目实践经验"
                autoComplete="off"
                {...field}
              />
            </FormControl>
            <FormDescription>说明学员已有的相关知识或实践经验。</FormDescription>
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
