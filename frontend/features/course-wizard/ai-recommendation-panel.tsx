import { Sparkles } from "lucide-react";

import type { CourseRecommendation } from "@/features/course-wizard/course-recommendation-rules";

export function AiRecommendationPanel({
  recommendations,
  onApply,
}: {
  recommendations: CourseRecommendation[];
  onApply: (recommendation: CourseRecommendation) => void;
}) {
  if (recommendations.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-[#dce4fb] bg-[#f5f7ff] p-4 sm:p-5"
      aria-labelledby="course-recommendations-title"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-primary shadow-sm">
          <Sparkles className="size-[18px]" aria-hidden="true" />
        </span>
        <div>
          <h3 id="course-recommendations-title" className="text-sm font-bold text-[#273149]">
            智能推荐
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            本地规则生成，无需调用 AI。选择建议后仍可继续修改。
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {recommendations.map((recommendation) => (
          <button
            key={recommendation.id}
            type="button"
            onClick={() => onApply(recommendation)}
            className="rounded-lg border bg-white p-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="block text-sm font-semibold leading-5 text-[#273149]">
              {recommendation.title}
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {recommendation.subject}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
