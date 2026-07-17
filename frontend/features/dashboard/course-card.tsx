import { ArrowUpRight, Clock3, MoreHorizontal } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CourseStatus, CourseSummary } from "@/types/course";

const statusLabel: Record<CourseStatus, string> = {
  draft: "草稿",
  submitted: "需求已保存",
  generating: "生成中",
  ready: "已就绪",
  error: "失败",
};

const statusStyle: Record<CourseStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  submitted: "bg-indigo-50 text-indigo-700",
  generating: "bg-blue-50 text-blue-700",
  ready: "bg-emerald-50 text-emerald-700",
  error: "bg-red-50 text-red-700",
};

const accentStyle = {
  blue: "from-[#345bd8] to-[#6f8ef5]",
  teal: "from-[#137d76] to-[#5bb4aa]",
  amber: "from-[#bd7415] to-[#e8aa55]",
};

interface CourseCardProps {
  course: CourseSummary;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(23,32,51,0.08)]">
      <div className={cn("h-1.5 bg-gradient-to-r", accentStyle[course.accent])} />
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", statusStyle[course.status])}>
                {statusLabel[course.status]}
              </span>
              <span className="text-xs text-muted-foreground">{course.subject}</span>
            </div>
            <h3 className="mt-4 truncate text-[17px] font-semibold tracking-tight text-[#172033]">
              {course.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {course.audience}
              {course.lessonCount === null ? " · 课时待设置" : ` · ${course.lessonCount} 课时`}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="-mr-2 -mt-2" aria-label={`更多操作：${course.title}`}>
            <MoreHorizontal className="size-[18px]" />
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            {course.updatedAt}
          </span>
          {course.id === "course-local-draft" ? (
            <Link
              href={course.status === "ready" ? "/courses/result" : "/courses/new"}
              className="flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-[#2949b6]"
            >
              {course.status === "ready" ? "查看蓝图" : "继续编辑"}
              <ArrowUpRight className="size-3.5" />
            </Link>
          ) : (
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-[#2949b6]"
              title="Workspace 将在后续 Sprint 开放"
            >
              打开课程
              <ArrowUpRight className="size-3.5" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
