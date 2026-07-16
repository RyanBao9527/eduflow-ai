import { Check } from "lucide-react";

import { WIZARD_STEPS } from "@/features/course-wizard/constants";
import { cn } from "@/lib/utils";

export function WizardStepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="新建课程步骤">
      {WIZARD_STEPS.map((step, index) => {
        const completed = currentStep > step.number;
        const active = currentStep === step.number;
        return (
          <li key={step.number} className="relative min-w-0">
            {index < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  "absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-4 h-px",
                  completed ? "bg-primary" : "bg-border",
                )}
                aria-hidden="true"
              />
            )}
            <div className="relative flex flex-col items-center text-center">
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full border bg-white text-xs font-bold transition-colors",
                  active && "border-primary bg-primary text-white ring-4 ring-primary/10",
                  completed && "border-primary bg-primary text-white",
                )}
                aria-current={active ? "step" : undefined}
              >
                {completed ? <Check className="size-4" /> : step.number}
              </span>
              <span
                className={cn(
                  "mt-2 hidden max-w-full truncate text-[11px] font-medium text-muted-foreground sm:block lg:text-xs",
                  active && "text-primary",
                )}
              >
                <span className="lg:hidden">{step.shortTitle}</span>
                <span className="hidden lg:inline">{step.title}</span>
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
