"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function CourseGenerationLoading({ lessonCount }: { lessonCount: number }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const detailMode = lessonCount <= 20 ? "detailed" : "balanced";

  useEffect(() => {
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const message =
    elapsedSeconds < 3
      ? "正在检查课程需求…"
      : elapsedSeconds < 10
        ? "正在规划课程模块…"
        : elapsedSeconds < 20
          ? "正在组织课时结构…"
          : detailMode === "detailed"
            ? "正在完善每节课的大纲…"
            : "正在整理课程阶段和关键课时…";

  return (
    <Card className="overflow-hidden border-primary/20">
      <div className="h-1 animate-pulse bg-primary" />
      <CardContent className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
        <div className="relative grid size-16 place-items-center rounded-2xl bg-secondary text-primary">
          <Sparkles className="size-7" aria-hidden="true" />
          <LoaderCircle className="absolute -inset-2 size-20 animate-spin opacity-30" aria-hidden="true" />
        </div>
        <h2 className="mt-6 text-xl font-bold text-[#172033]">AI 正在生成课程蓝图</h2>
        <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
          {message}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">已等待 {elapsedSeconds} 秒</p>
        {detailMode === "balanced" && (
          <p className="mt-5 max-w-lg rounded-lg bg-muted px-4 py-3 text-xs leading-5 text-muted-foreground">
            长课程会优先保证模块、阶段和完整课时索引，再展开关键课时。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
