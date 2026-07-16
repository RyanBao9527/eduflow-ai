"use client";

import {
  ClipboardCheck,
  FileChartColumn,
  FileText,
  ListChecks,
  NotebookText,
  Presentation,
  Speech,
} from "lucide-react";
import { useFormContext } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { RESOURCE_OPTIONS } from "@/features/course-wizard/constants";
import type { CourseBriefFormValues } from "@/features/course-wizard/course-brief-schema";
import { cn } from "@/lib/utils";

const resourceIcons = [
  NotebookText,
  Speech,
  FileText,
  Presentation,
  ListChecks,
  ClipboardCheck,
  FileChartColumn,
];

export function ResourceSelectionStep() {
  const form = useFormContext<CourseBriefFormValues>();

  return (
    <div className="space-y-7">
      <FormField
        control={form.control}
        name="requestedResources"
        render={({ field }) => {
          const selectedResources = field.value ?? [];
          return (
            <FormItem>
              <FormLabel>需要生成的课程资源</FormLabel>
              <FormDescription>至少选择一种资源，后续可在导出中心单独生成。</FormDescription>
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                {RESOURCE_OPTIONS.map((resource, index) => {
                  const Icon = resourceIcons[index];
                  const checked = selectedResources.includes(resource.value);
                  return (
                    <label
                      key={resource.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 transition-all hover:border-primary/25 hover:bg-muted/55",
                        checked && "border-primary/40 bg-[#f2f5ff] shadow-sm",
                      )}
                    >
                      <Checkbox
                        className="mt-1"
                        checked={checked}
                        onCheckedChange={(value) =>
                          field.onChange(
                            value === true
                              ? [...selectedResources, resource.value]
                              : selectedResources.filter((item) => item !== resource.value),
                          )
                        }
                        aria-label={resource.label}
                      />
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                        <Icon className="size-[18px]" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-[#273149]">{resource.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {resource.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <FormField
        control={form.control}
        name="extraRequirements"
        render={({ field }) => (
          <FormItem>
            <FormLabel>额外要求（可选）</FormLabel>
            <FormControl>
              <Textarea
                placeholder="例如：增加小组合作环节，案例尽量贴近校园生活。"
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
