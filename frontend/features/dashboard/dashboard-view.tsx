"use client";

import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Presentation,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CourseCard } from "@/features/dashboard/course-card";
import {
  dashboardMetrics,
  recentCourses,
  recentExports,
} from "@/features/dashboard/mock-data";
import { MetricCard } from "@/features/dashboard/metric-card";
import { getLocalCourseSummary } from "@/features/dashboard/local-course";
import { useEffect, useState } from "react";

const exportIcons = [FileText, Presentation, CheckCircle2];

export function DashboardView() {
  const [localCourse, setLocalCourse] = useState<ReturnType<typeof getLocalCourseSummary>>(null);

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (active) setLocalCourse(getLocalCourseSummary(window.localStorage));
    });
    return () => {
      active = false;
    };
  }, []);

  const courses = localCourse
    ? [localCourse, ...recentCourses.filter((course) => course.title !== localCourse.title)]
    : recentCourses;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <div className="min-w-0 flex-1">
        <PageHeader
          title="工作台"
          description="管理课程研发进度，并快速进入最近的课程项目。"
        />

        <main className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <section
            className="relative overflow-hidden rounded-2xl border border-[#dce4fb] bg-[#eef3ff] p-6 sm:p-8"
            aria-labelledby="welcome-title"
          >
            <div className="absolute -right-16 -top-20 size-64 rounded-full border-[40px] border-white/45" />
            <div className="absolute right-32 top-8 hidden size-20 rounded-full border-[18px] border-[#dce6ff] lg:block" />
            <div className="relative max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#3157d5] shadow-sm">
                <Sparkles className="size-3.5" />
                AI Course Development Workspace
              </div>
              <h2
                id="welcome-title"
                className="text-2xl font-bold tracking-[-0.03em] text-[#18264c] sm:text-[28px]"
              >
                从一个课程想法，走到完整交付
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#53617d]">
                在同一个工作台中组织课程结构、教案、讲义、课件、练习与课程包。
                示例课程之外，你在当前设备保存的课程草稿也会显示在最近课程中。
              </p>
              <Button asChild className="mt-5">
                <Link href="/courses/new">
                  新建一门课程
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="课程统计">
            {dashboardMetrics.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </section>

          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section aria-labelledby="recent-courses-title">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 id="recent-courses-title" className="text-lg font-bold tracking-tight">
                    最近课程
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">继续处理最近编辑的课程项目</p>
                </div>
                <button type="button" className="text-sm font-semibold text-primary hover:text-[#2949b6]">
                  查看全部
                </button>
              </div>
              <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </section>

            <aside aria-labelledby="recent-exports-title">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle id="recent-exports-title">最近导出</CardTitle>
                    <CardDescription className="mt-1">已生成的课程资源</CardDescription>
                  </div>
                  <button type="button" className="text-xs font-semibold text-primary">
                    全部记录
                  </button>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-1">
                    {recentExports.map((item, index) => {
                      const Icon = exportIcons[index];
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted"
                        >
                          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#273149]">
                              {item.courseTitle}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {item.resourceType}
                            </p>
                          </div>
                          <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                            {item.exportedAt}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
