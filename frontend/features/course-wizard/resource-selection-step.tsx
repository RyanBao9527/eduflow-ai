"use client";

import {
  CheckCircle2,
  ClipboardCheck,
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
import {
  ADVANCED_RESOURCE_OPTIONS,
  MORE_RESOURCE_OPTIONS,
} from "@/features/course-wizard/constants";
import type { CourseBriefFormValues } from "@/features/course-wizard/course-brief-schema";
import { cn } from "@/lib/utils";

const resourceIcons = {
  slides: Presentation,
  lesson_plan: NotebookText,
  worksheet: ListChecks,
  teacher_script: Speech,
  student_handout: FileText,
  assessment: ClipboardCheck,
} as const;

type SelectableResource =
  | (typeof ADVANCED_RESOURCE_OPTIONS)[number]
  | (typeof MORE_RESOURCE_OPTIONS)[number];

function ResourceOptionCard({
  resource,
  checked,
  onCheckedChange,
}: {
  resource: SelectableResource;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const Icon = resourceIcons[resource.value];

  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 transition-all hover:border-primary/25 hover:bg-muted/55",
        checked && "border-primary/40 bg-[#f2f5ff] shadow-sm",
      )}
    >
      <Checkbox
        className="mt-1"
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
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
}

export function ResourceSelectionStep() {
  const form = useFormContext<CourseBriefFormValues>();

  return (
    <div className="space-y-7">
      <section aria-labelledby="included-resources-title" className="space-y-3">
        <div>
          <h3 id="included-resources-title" className="text-sm font-semibold text-[#273149]">
            基础方案
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            创建 AI 课程时固定包含，无需额外选择。
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["课程蓝图", "课程定位、学习目标、模块与课时结构"],
            ["教学大纲与课程规划", "教学策略、评估方案与资源用途规划"],
          ].map(([title, description]) => (
            <div key={title} className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-[#273149]">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          以上内容属于课程蓝图的固有产物，不会创建独立的教学资源文件。
        </p>
      </section>

      <FormField
        control={form.control}
        name="requestedResources"
        render={({ field }) => {
          const selectedResources = field.value ?? [];
          const updateResource = (resource: SelectableResource, checked: boolean) => {
            field.onChange(
              checked
                ? Array.from(new Set([...selectedResources, resource.value]))
                : selectedResources.filter((item) => item !== resource.value),
            );
          };

          return (
            <FormItem>
              <FormLabel>高级资源</FormLabel>
              <FormDescription>
                选择希望后续生成的资源。当前步骤只规划用途，不生成资源正文或文件。
              </FormDescription>
              <div className="grid gap-3 pt-2 sm:grid-cols-3">
                {ADVANCED_RESOURCE_OPTIONS.map((resource) => (
                  <ResourceOptionCard
                    key={resource.value}
                    resource={resource}
                    checked={selectedResources.includes(resource.value)}
                    onCheckedChange={(checked) => updateResource(resource, checked)}
                  />
                ))}
              </div>

              <details className="mt-4 rounded-xl border bg-muted/25 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#273149]">
                  更多资源
                </summary>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  保留已有课程项目中的资源选项，选择结果继续使用原有数据字段。
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {MORE_RESOURCE_OPTIONS.map((resource) => (
                    <ResourceOptionCard
                      key={resource.value}
                      resource={resource}
                      checked={selectedResources.includes(resource.value)}
                      onCheckedChange={(checked) => updateResource(resource, checked)}
                    />
                  ))}
                </div>
              </details>
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
            <FormLabel>补充要求（可选）</FormLabel>
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
