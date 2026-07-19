import { Sparkles } from "lucide-react";

import type { CourseTitleSuggestion } from "@/features/course-wizard/course-recommendation-rules";

export function AiRecommendationPanel({
  suggestions,
  onSelect,
}: {
  suggestions: CourseTitleSuggestion[];
  onSelect: (suggestion: CourseTitleSuggestion) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-[#dce4fb] bg-[#f5f7ff] p-4 sm:p-5"
      aria-labelledby="course-title-suggestions-title"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-primary shadow-sm">
          <Sparkles className="size-[18px]" aria-hidden="true" />
        </span>
        <div>
          <h3 id="course-title-suggestions-title" className="text-sm font-bold text-[#273149]">
            课程名称建议
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            基于课程主题的本地规则推荐，不调用 AI 或网络。选择后仍可继续修改。
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            onClick={() => onSelect(suggestion)}
            className="rounded-lg border bg-white p-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="block text-sm font-semibold leading-5 text-[#273149]">
              {suggestion.title}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
