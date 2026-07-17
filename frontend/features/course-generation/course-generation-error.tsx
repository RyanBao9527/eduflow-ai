import { AlertTriangle, RotateCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { CourseGenerationApiError } from "@/features/course-generation/course-generation-api";

export function CourseGenerationError({
  error,
  onRetry,
}: {
  error: CourseGenerationApiError;
  onRetry: () => void;
}) {
  return (
    <Alert className="border-red-200 bg-red-50/80 text-red-900">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <AlertTitle>课程蓝图生成失败</AlertTitle>
          <AlertDescription className="text-red-800">
            {error.message}
            {error.requestId && (
              <span className="mt-1 block text-xs">请求编号：{error.requestId}</span>
            )}
          </AlertDescription>
          {error.retryable && (
            <Button type="button" size="sm" className="mt-3" onClick={onRetry}>
              <RotateCcw className="size-3.5" />
              重新生成
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}
