"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, RotateCcw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
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
import {
  CourseGenerationApiError,
  generateCoursePlan,
} from "@/features/course-generation/course-generation-api";
import { CourseGenerationError } from "@/features/course-generation/course-generation-error";
import { CourseGenerationLoading } from "@/features/course-generation/course-generation-loading";
import { saveCourseGeneration } from "@/features/course-generation/course-generation-storage";
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
import { migrateLegacyCourseProject } from "@/features/course-workspace/course-project-migration";
import {
  attachGenerationToProject,
  createDraftCourseProject,
  deleteCourseProject,
  getCourseProject,
  updateDraftCourseProject,
} from "@/features/course-workspace/course-project-storage";

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
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [draftState, setDraftState] = useState<DraftSaveState>("idle");
  const [hydrated, setHydrated] = useState(false);
  const [stepErrorMessages, setStepErrorMessages] = useState<string[]>([]);
  const [generationBrief, setGenerationBrief] = useState<CourseBrief | null>(null);
  const [generationError, setGenerationError] = useState<CourseGenerationApiError | null>(null);
  const [resultNotice, setResultNotice] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const inFlightRef = useRef(false);

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
  const projectIdRef = useRef<string | null>(projectId);

  useEffect(() => {
    latestValuesRef.current = watchedValues;
  }, [watchedValues]);

  useEffect(() => {
    latestStepRef.current = currentStep;
    projectIdRef.current = projectId;
  }, [currentStep, projectId]);

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (!active) return;
      const requestedId = new URLSearchParams(window.location.search).get("projectId");
      const migrated = migrateLegacyCourseProject(window.localStorage, window.sessionStorage);
      const requestedProject = requestedId
        ? getCourseProject(window.localStorage, requestedId)
        : null;
      const project = requestedProject ?? migrated;
      const values = project?.courseBrief ?? {};
      const restored = hasMeaningfulDraftValues(values);
      reset({
        ...DEFAULT_COURSE_BRIEF_VALUES,
        ...values,
      } as CourseBriefFormValues);
      setCurrentStep(project?.wizardStep ?? 1);
      if (project) {
        setProjectId(project.id);
        projectIdRef.current = project.id;
        if (requestedId !== project.id) {
          window.history.replaceState(null, "", `/courses/new?projectId=${project.id}`);
        }
      }
      setDraftState(restored ? "restored" : "idle");
      setResultNotice(new URLSearchParams(window.location.search).get("result") === "missing");
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, [reset]);

  const persistDraft = useCallback(
    () => {
      try {
        if (!hasMeaningfulDraftValues(latestValuesRef.current)) return null;
        const existingId = projectIdRef.current;
        const project = existingId
          ? updateDraftCourseProject(
              window.localStorage,
              existingId,
              latestValuesRef.current,
              latestStepRef.current,
            )
          : createDraftCourseProject(
              window.localStorage,
              latestValuesRef.current,
              undefined,
              latestStepRef.current,
            );
        if (!existingId) {
          projectIdRef.current = project.id;
          setProjectId(project.id);
          window.history.replaceState(null, "", `/courses/new?projectId=${project.id}`);
        }
        setDraftState("saved");
        return project.id;
      } catch {
        setDraftState("error");
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!hydrated) return;
    const statusTimer = window.setTimeout(() => setDraftState("saving"), 0);
    const saveTimer = window.setTimeout(
      () => persistDraft(),
      COURSE_WIZARD_SAVE_DELAY_MS,
    );
    return () => {
      window.clearTimeout(statusTimer);
      window.clearTimeout(saveTimer);
    };
  }, [currentStep, hydrated, persistDraft, watchedValuesSignature]);

  useEffect(() => {
    if (!hydrated) return;
    const handleBeforeUnload = () => {
      try {
        const id = projectIdRef.current;
        if (id) {
          updateDraftCourseProject(
            window.localStorage,
            id,
            latestValuesRef.current,
            latestStepRef.current,
          );
        }
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
    setStepErrorMessages([]);
    setGenerationError(null);
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
    setStepErrorMessages([]);
    setGenerationError(null);
    setCurrentStep((step) => Math.max(step - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleValidSubmit = async (brief: CourseBrief) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setStepErrorMessages([]);
    setGenerationError(null);
    try {
      latestValuesRef.current = brief;
      latestStepRef.current = 5;
      const id = projectIdRef.current;
      const project = id
        ? updateDraftCourseProject(window.localStorage, id, brief, 5)
        : createDraftCourseProject(window.localStorage, brief, undefined, 5);
      projectIdRef.current = project.id;
      setProjectId(project.id);
      window.history.replaceState(null, "", `/courses/new?projectId=${project.id}`);
      setDraftState("saved");
    } catch {
      setDraftState("error");
      setGenerationError(
        new CourseGenerationApiError("课程草稿无法保存到当前设备，请检查浏览器存储空间后重试。"),
      );
      inFlightRef.current = false;
      return;
    }
    const controller = new AbortController();
    setGenerationBrief(brief);
    try {
      const response = await generateCoursePlan(brief, controller.signal);
      const id = projectIdRef.current;
      if (!id) throw new Error("课程项目尚未创建");
      try {
        attachGenerationToProject(window.localStorage, id, brief, response);
      } catch {
        saveCourseGeneration(window.sessionStorage, brief, response);
        router.push(`/courses/result?projectId=${id}&recovery=session`);
        return;
      }
      router.push(`/courses/result?projectId=${id}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setGenerationError(
        error instanceof CourseGenerationApiError
          ? error
          : new CourseGenerationApiError("课程蓝图生成失败，请重试。"),
      );
      setGenerationBrief(null);
    } finally {
      inFlightRef.current = false;
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
    try {
      if (projectIdRef.current) deleteCourseProject(window.localStorage, projectIdRef.current);
    } catch {
      setDraftState("error");
      return;
    }
    clearCourseWizardDraft(window.localStorage);
    form.reset(DEFAULT_COURSE_BRIEF_VALUES);
    setCurrentStep(1);
    setStepErrorMessages([]);
    setGenerationError(null);
    setProjectId(null);
    projectIdRef.current = null;
    window.history.replaceState(null, "", "/courses/new");
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

  if (generationBrief) {
    return <CourseGenerationLoading lessonCount={generationBrief.lessonCount} />;
  }

  const retryGeneration = () => {
    void form.handleSubmit(handleValidSubmit, handleInvalidSubmit)();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={
          // The request lock is read only after the submit event starts.
          // eslint-disable-next-line react-hooks/refs
          form.handleSubmit(handleValidSubmit, handleInvalidSubmit)
        }
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
                    ? "检查课程需求，确认无误后生成可扩展的 AI 课程蓝图。"
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

            {resultNotice && currentStep === 5 && (
              <Alert className="border-blue-200 bg-blue-50/80 text-blue-900">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  <div>
                    <AlertTitle>当前标签页没有可恢复的课程蓝图</AlertTitle>
                    <AlertDescription className="text-blue-800">
                      课程需求草稿仍然保留。确认需求后可以重新生成课程蓝图。
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            {generationError && (
              <CourseGenerationError error={generationError} onRetry={retryGeneration} />
            )}

            {StepComponent ? (
              <StepComponent />
            ) : (
              <CourseBriefReview onEdit={goToStep} />
            )}

            <div className="flex items-start gap-2 rounded-lg bg-muted/70 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              课程需求保存在当前设备。生成请求仅发送到已配置的后端 AI 服务，API Key 不会进入浏览器。
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
