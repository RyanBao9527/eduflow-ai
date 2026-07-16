"use client";

import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TEACHING_SCENARIOS } from "@/features/course-wizard/constants";
import type { CourseBriefFormValues } from "@/features/course-wizard/course-brief-schema";

export function BasicInfoStep() {
  const form = useFormContext<CourseBriefFormValues>();

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="courseTitle"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>课程名称</FormLabel>
            <FormControl>
              <Input placeholder="例如：分数的初步认识" autoComplete="off" {...field} />
            </FormControl>
            <FormDescription>使用清晰、便于识别的课程名称。</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="subject"
        render={({ field }) => (
          <FormItem>
            <FormLabel>学科或领域</FormLabel>
            <FormControl>
              <Input placeholder="例如：小学数学" autoComplete="off" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="topic"
        render={({ field }) => (
          <FormItem>
            <FormLabel>课程主题</FormLabel>
            <FormControl>
              <Input placeholder="例如：认识分数并解决生活问题" autoComplete="off" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="teachingScenario"
        render={({ field }) => (
          <FormItem>
            <FormLabel>教学场景</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ""}>
              <FormControl>
                <SelectTrigger aria-label="教学场景">
                  <SelectValue placeholder="请选择教学场景" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {TEACHING_SCENARIOS.map((option) => (
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
        name="description"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>课程描述（可选）</FormLabel>
            <FormControl>
              <Textarea
                placeholder="补充课程背景、希望解决的问题或已有课程素材。"
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormDescription>最多 1000 个字符。</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
