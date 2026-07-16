"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, RotateCcw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useForm,
  useWatch,
  type FieldErrors,
  type FieldPath,
} from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { BasicInfoStep } from "@/features/course-wizard/basic-info-step";
import { CourseBriefReview } from "@/features/course-wizard/course-brief-review";
import {
  courseBriefSchema,
  DEFAULT_COURSE_BRIEF_VALUES,
  type CourseBrief,
  type CourseBriefFormValues,
} from "@/features/course-wizard/course-brief-schema";
import {
  STEP_FIELDS,
  WIZARD_STEPS,
} from "@/features/course-wizard/constants";
import {
  clearCourseWizardDraft,
  COURSE_WIZARD_SAVE_DELAY_MS,
  hasMeaningfulDraftValues,
  loadCourseWizardDraft,
  saveCourseWizardDraft,
} from "@/features/course-wizard/draft-storage";
import {
  DraftStatus,
  type DraftSaveState,
} from "@/features/course-wizard/draft-status";
import { FormErrorSummary } from "@/features/course-wizard/form-error-summary";
import { PlanningStyleStep } from "@/features/course-wizard/planning-style-step";
import { ResourceSelectionStep } from "@/features/course-wizard/resource-selection-step";
import { TargetLearnersStep } from "@/features/course-wizard/target-learners-step";
import { WizardNavigation } from "@/features/course-wizard/wizard-navigation";
import { WizardStepIndicator } from "@/features/course-wizard/wizard-step-indicator";

const stepComponents = [
  BasicInfoStep,
  TargetLearnersStep,
  PlanningStyleStep,
  ResourceSelectionStep,
] as const;

function getErrorMessages(
  errors: FieldErrors<CourseBriefFormValues>,
  fields: FieldPath<CourseBriefFormValues>[],
) {
  return fields
    .map((field) => errors[field as keyof CourseBriefFormValues]?.message)
    .filter((message): message is string => typeof message === "string");
}

export function CourseWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [draftState, setDraftState] = useState<DraftSaveState>("idle");
  const [hydrated, setHydrated] = useState(false);
  const [submittedBrief, setSubmittedBrief] = useState<CourseBrief | null>(null);
  const [stepErrorMessages, setStepErrorMessages] = useState<string[]>([]);

  const form = useForm<CourseBriefFormValues, unknown, CourseBrief>({
    resolver: zodResolver(courseBriefSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: DEFAULT_COURSE_BRIEF_VALUES,
  });
  const { reset } = form;

  const watchedValues = useWatch({ control: form.control });
  const watchedValuesSignature = JSON.stringify(watchedValues);
  const latestValuesRef = useRef<Partial<CourseBriefFormValues>>(watchedValues);
  const latestStepRef = useRef(currentStep);
  const submittedRef = useRef(Boolean(submittedBrief));

  useEffect(() => {
    latestValuesRef.current = watchedValues;
  }, [watchedValues]);

  useEffect(() => {
    latestStepRef.current = currentStep;
    submittedRef.current = Boolean(submittedBrief);
  }, [currentStep, submittedBrief]);

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (!active) return;
      const draft = loadCourseWizardDraft(window.localStorage);
      const restored = hasMeaningfulDraftValues(draft.values);
      reset({
        ...DEFAULT_COURSE_BRIEF_VALUES,
        ...draft.values,
      } as CourseBriefFormValues);
      setCurrentStep(draft.currentStep);
      setSubmittedBrief(
        draft.status === "submitted"
          ? courseBriefSchema.safeParse(draft.values).data ?? null
          : null,
      );
      setDraftState(restored ? "restored" : "idle");
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, [reset]);

  const persistDraft = useCallback(
    (status: "draft" | "submitted" = "draft") => {
      try {
        saveCourseWizardDraft(window.localStorage, {
          currentStep: latestStepRef.current,
          values: latestValuesRef.current,
          status,
        });
        setDraftState("saved");
      } catch {
        setDraftState("error");
      }
    },
    [],
  );

  useEffect(() => {
    if (!hydrated) return;
    const statusTimer = window.setTimeout(() => setDraftState("saving"), 0);
    const saveTimer = window.setTimeout(
      () => persistDraft(submittedBrief ? "submitted" : "draft"),
      COURSE_WIZARD_SAVE_DELAY_MS,
    );
    return () => {
      window.clearTimeout(statusTimer);
      window.clearTimeout(saveTimer);
    };
  }, [currentStep, hydrated, persistDraft, submittedBrief, watchedValuesSignature]);

  useEffect(() => {
    if (!hydrated) return;
    const handleBeforeUnload = () => {
      try {
        saveCourseWizardDraft(window.localStorage, {
          currentStep: latestStepRef.current,
          values: latestValuesRef.current,
          status: submittedRef.current ? "submitted" : "draft",
        });
      } catch {
        // The draft remains available in memory when browser storage is blocked.
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hydrated]);

  const currentStepErrors = useMemo(
    () => getErrorMessages(form.formState.errors, STEP_FIELDS[currentStep]),
    [currentStep, form.formState.errors],
  );

  const goToStep = (step: number) => {
    setSubmittedBrief(null);
    setStepErrorMessages([]);
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = async () => {
    const valid = await form.trigger(STEP_FIELDS[currentStep], { shouldFocus: true });
    if (!valid) {
      setStepErrorMessages(
        getErrorMessages(form.formState.errors, STEP_FIELDS[currentStep]),
      );
      return;
    }
    setStepErrorMessages([]);
    setCurrentStep((step) => Math.min(step + 1, 5));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevious = () => {
    setSubmittedBrief(null);
    setStepErrorMessages([]);
    setCurrentStep((step) => Math.max(step - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleValidSubmit = (brief: CourseBrief) => {
    setSubmittedBrief(brief);
    setStepErrorMessages([]);
    try {
      saveCourseWizardDraft(window.localStorage, {
        currentStep: 5,
        values: brief,
        status: "submitted",
      });
      setDraftState("saved");
    } catch {
      setDraftState("error");
    }
  };

  const handleInvalidSubmit = (errors: FieldErrors<CourseBriefFormValues>) => {
    for (let step = 1; step <= 4; step += 1) {
      const messages = getErrorMessages(errors, STEP_FIELDS[step]);
      if (messages.length > 0) {
        setCurrentStep(step);
        setStepErrorMessages(messages);
        return;
      }
    }
  };

  const handleClearDraft = () => {
    const confirmed = window.confirm("确定清除当前课程草稿并重新开始吗？此操作无法撤销。");
    if (!confirmed) return;
    clearCourseWizardDraft(window.localStorage);
    form.reset(DEFAULT_COURSE_BRIEF_VALUES);
    setCurrentStep(1);
    setSubmittedBrief(null);
    setStepErrorMessages([]);
    setDraftState("idle");
  };

  const StepComponent = currentStep <= 4 ? stepComponents[currentStep - 1] : null;
  const stepMeta = WIZARD_STEPS[currentStep - 1];
  const displayedErrors = stepErrorMessages.length > 0 ? stepErrorMessages : currentStepErrors;

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">
          正在准备课程向导…
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleValidSubmit, handleInvalidSubmit)}
        noValidate
        className="space-y-5"
      >
        <Card>
          <CardHeader className="border-b pb-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  第 {currentStep} 步，共 5 步
                </p>
                <CardTitle className="mt-2 text-xl sm:text-2xl">{stepMeta.title}</CardTitle>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {currentStep === 5
                    ? "检查课程需求，确认无误后保存到当前设备。"
                    : "填写的信息会自动保存为当前设备上的本地草稿。"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <DraftStatus state={draftState} />
                <Button type="button" variant="ghost" size="sm" onClick={handleClearDraft}>
                  <RotateCcw className="size-3.5" />
                  清除草稿
                </Button>
              </div>
            </div>
            <div className="mt-6">
              <WizardStepIndicator currentStep={currentStep} />
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <FormErrorSummary messages={displayedErrors} />

            {submittedBrief && currentStep === 5 && (
              <Alert className="border-emerald-200 bg-emerald-50/80 text-emerald-900">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  <div>
                    <AlertTitle>课程需求已保存</AlertTitle>
                    <AlertDescription className="text-emerald-800">
                      已保存到当前设备。AI 课程方案生成将在下一 Sprint 接入，本次没有发送任何网络请求。
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            {StepComponent ? (
              <StepComponent />
            ) : (
              <CourseBriefReview onEdit={goToStep} />
            )}

            <div className="flex items-start gap-2 rounded-lg bg-muted/70 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              本 Sprint 仅保存本地课程需求，不会调用课程生成或模型接口。
            </div>

            <WizardNavigation
              currentStep={currentStep}
              isSubmitting={form.formState.isSubmitting}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
