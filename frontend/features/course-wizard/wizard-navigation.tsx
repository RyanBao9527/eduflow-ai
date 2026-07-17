import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

interface WizardNavigationProps {
  currentStep: number;
  isSubmitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function WizardNavigation({
  currentStep,
  isSubmitting,
  onPrevious,
  onNext,
}: WizardNavigationProps) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={currentStep === 1 || isSubmitting}
      >
        <ArrowLeft className="size-4" />
        上一步
      </Button>

      {currentStep < 5 ? (
        <Button type="button" onClick={onNext} disabled={isSubmitting}>
          下一步
          <ArrowRight className="size-4" />
        </Button>
      ) : (
        <Button type="submit" disabled={isSubmitting}>
          <Sparkles className="size-4" />
          {isSubmitting ? "正在生成…" : "AI 生成课程蓝图"}
        </Button>
      )}
    </div>
  );
}
