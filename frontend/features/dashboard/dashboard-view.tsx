"use client";

import {
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CourseProjectList } from "@/features/dashboard/course-project-list";
import { MetricCard } from "@/features/dashboard/metric-card";
import { migrateLegacyCourseProject } from "@/features/course-workspace/course-project-migration";
import { listCourseProjects } from "@/features/course-workspace/course-project-storage";
import type { CourseProject } from "@/features/course-workspace/course-project-schema";
import type { CourseSummary, DashboardMetric } from "@/types/course";
import { useEffect, useState } from "react";

function formatUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "刚刚更新";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toCourseSummary(project: CourseProject, index: number): CourseSummary {
  const hasPreview = project.status === "draft" && Boolean(project.coursePlan);
  return {
    id: project.id,
    title: project.title,
    subject: project.courseBrief.subject?.trim() || "尚未设置学科",
    audience: project.courseBrief.targetLearners?.trim() || "尚未设置目标学员",
    lessonCount: project.courseBrief.lessonCount ?? null,
    status: project.status,
    updatedAt: formatUpdatedAt(project.updatedAt),
    accent: (["blue", "teal", "amber"] as const)[index % 3],
    href: project.status === "draft"
      ? hasPreview
        ? `/courses/result?projectId=${project.id}`
        : `/courses/new?projectId=${project.id}`
      : `/courses/${project.id}`,
    actionLabel: project.status === "draft"
      ? hasPreview ? "查看蓝图" : "继续填写"
      : "打开课程",
  };
}

function getMetrics(projects: CourseProject[]): DashboardMetric[] {
  const count = (status: CourseProject["status"]) => projects.filter((project) => project.status === status).length;
  return [
    { label: "课程项目", value: String(projects.length), change: "当前设备", tone: "blue" },
    { label: "课程草稿", value: String(count("draft")), change: "待完成或待保存", tone: "amber" },
    { label: "已生成", value: String(count("generated")), change: "AI 蓝图已保存", tone: "green" },
    { label: "已编辑", value: String(count("editing")), change: "人工修改已保存", tone: "violet" },
  ];
}

export function DashboardView() {
  const [projects, setProjects] = useState<CourseProject[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (!active) return;
      migrateLegacyCourseProject(window.localStorage, window.sessionStorage);
      setProjects(listCourseProjects(window.localStorage));
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const courses = projects.map(toCourseSummary);
  const dashboardMetrics = getMetrics(projects);

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
                在同一个工作台中组织课程结构、保存 AI 蓝图，并持续完善课程项目。
                所有项目当前保存在这台设备的浏览器中。
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

          <div className="mt-8">
            <section id="course-projects" aria-labelledby="course-projects-title">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 id="course-projects-title" className="text-lg font-bold tracking-tight">
                    课程项目
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">按最近更新时间排列，可继续填写、确认蓝图或进入 Workspace</p>
                </div>
              </div>
              {hydrated ? <CourseProjectList courses={courses} /> : (
                <div className="rounded-2xl border bg-white p-8 text-center text-sm text-muted-foreground">正在加载课程项目…</div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
