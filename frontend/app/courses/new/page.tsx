import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CourseWizard } from "@/features/course-wizard/course-wizard";

export default function NewCoursePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-white">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[#172033]">EduFlow AI</span>
              <span className="block truncate text-xs text-muted-foreground">新建课程</span>
            </span>
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
              返回工作台
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 max-w-2xl">
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#172033] sm:text-[30px]">
            创建课程需求
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            通过五个步骤整理课程背景、学员、教学规划和资源需求。
          </p>
        </div>
        <CourseWizard />
      </main>
    </div>
  );
}
