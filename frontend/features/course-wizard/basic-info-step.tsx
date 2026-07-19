"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
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
import { AiRecommendationPanel } from "@/features/course-wizard/ai-recommendation-panel";
import {
  COURSE_TOPIC_GROUPS,
  getCourseTitleSuggestions,
  getDefaultCourseDescription,
  getSubjectRecommendation,
  type SubjectOrigin,
} from "@/features/course-wizard/course-recommendation-rules";
import { TEACHING_SCENARIOS } from "@/features/course-wizard/constants";
import type { CourseBriefFormValues } from "@/features/course-wizard/course-brief-schema";

const cardClassName = "rounded-xl border bg-white p-4 sm:p-5";

export function BasicInfoStep({
  subjectOrigin,
  onSubjectOriginChange,
}: {
  subjectOrigin: SubjectOrigin;
  onSubjectOriginChange: (origin: SubjectOrigin) => void;
}) {
  const form = useFormContext<CourseBriefFormValues>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [courseTitle, topic, description] = useWatch({
    control: form.control,
    name: ["courseTitle", "topic", "description"],
  });
  const [descriptionOpen, setDescriptionOpen] = useState(Boolean(description?.trim()));
  const titleSuggestions = getCourseTitleSuggestions(topic);
  const hasSettingsError = Boolean(
    form.formState.errors.teachingScenario ||
      form.formState.errors.subject,
  );
  const hasDescriptionError = Boolean(form.formState.errors.description);
  const showLegacyTopicNotice = Boolean(courseTitle?.trim() && !topic?.trim());

  const fillSubjectFromTopic = (nextTopic: string) => {
    if (subjectOrigin !== "unset" || form.getValues("subject")?.trim()) return;
    const recommendation = getSubjectRecommendation(nextTopic);
    if (!recommendation) return;

    form.setValue("subject", recommendation, {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false,
    });
    onSubjectOriginChange("default");
  };

  const applyTopic = (nextTopic: string) => {
    form.setValue("topic", nextTopic, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    fillSubjectFromTopic(nextTopic);
  };

  const applyDefaultDescription = () => {
    if (form.getValues("description")?.trim()) return;
    const description = getDefaultCourseDescription(form.getValues("topic"));
    if (!description) return;
    form.setValue("description", description, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="space-y-4">
      <section className={cardClassName} aria-label="课程主题信息">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-[#273149]">
              课程主题
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              课程的核心方向，用于决定后续课程内容。
            </p>
          </div>

          <FormField
            control={form.control}
            name="topic"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">课程主题</FormLabel>
                <FormControl>
                  <Input
                    placeholder="例如：Python编程、人工智能应用、数据分析"
                    autoComplete="off"
                    {...field}
                    onChange={(event) => applyTopic(event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {showLegacyTopicNotice && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              请补充课程主题。
            </p>
          )}

          <div className="space-y-3" aria-label="课程主题推荐标签">
            {COURSE_TOPIC_GROUPS.map((group) => (
              <div key={group.label}>
                <p
                  className="text-xs font-medium text-muted-foreground"
                  aria-label={`主题分组：${group.label}`}
                >
                  {group.label}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {group.tags.map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => applyTopic(tag)}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cardClassName} aria-label="课程名称信息">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#273149]">
                课程名称
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                展示给学生或客户的课程标题，可稍后填写；创建 AI 课程前需填写。
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={titleSuggestions.length === 0}
              onClick={() => setShowTitleSuggestions((visible) => !visible)}
            >
              <Sparkles className="size-3.5" />
              生成课程名称建议
            </Button>
          </div>

          <FormField
            control={form.control}
            name="courseTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">课程名称</FormLabel>
                <FormControl>
                  <Input
                    placeholder="例如：Python小游戏开发实践"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                {(form.formState.submitCount > 0 ||
                  form.formState.errors.courseTitle?.type === "manual") && <FormMessage />}
              </FormItem>
            )}
          />

          {showTitleSuggestions && (
            <AiRecommendationPanel
              suggestions={titleSuggestions}
              onSelect={(suggestion) => {
                form.setValue("courseTitle", suggestion.title, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                });
              }}
            />
          )}
        </div>
      </section>

      <details
        className={cardClassName}
        open={descriptionOpen || hasDescriptionError}
        onToggle={(event) => setDescriptionOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset">
          <span className="text-base font-bold text-[#273149]">课程简介（可选）</span>
          <span className="mt-1 block text-sm leading-6 text-muted-foreground">
            可补充课程背景、希望解决的问题或已有素材。
          </span>
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!topic?.trim() || Boolean(form.getValues("description")?.trim())}
              onClick={applyDefaultDescription}
            >
              生成默认简介
            </Button>
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">课程简介</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="可选：补充课程背景、希望解决的问题或已有课程素材。"
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
      </details>

      <details
        className="group rounded-xl border bg-muted/25"
        open={settingsOpen || hasSettingsError}
        onToggle={(event) => setSettingsOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[#273149] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset">
          更多课程设置
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            课程领域与教学场景
          </span>
        </summary>
        <div className="grid gap-6 border-t p-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>课程领域</FormLabel>
                <FormControl>
                  <Input
                    placeholder="例如：编程教育"
                    autoComplete="off"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(event) => {
                      field.onChange(event);
                      onSubjectOriginChange("user");
                    }}
                  />
                </FormControl>
                <FormDescription>会根据课程主题推荐，可自行修改。</FormDescription>
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
        </div>
      </details>

      <p className="rounded-xl bg-muted/55 px-4 py-3 text-sm leading-6 text-muted-foreground">
        下一步将选择学习者画像，系统会据此组织课程难度和课时规划。
      </p>
    </div>
  );
}
