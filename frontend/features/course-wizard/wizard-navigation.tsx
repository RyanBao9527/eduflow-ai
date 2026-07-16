import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

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
          <CheckCircle2 className="size-4" />
          {isSubmitting ? "正在保存…" : "确认并保存课程需求"}
        </Button>
      )}
    </div>
  );
}
