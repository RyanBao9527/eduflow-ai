import { FolderOpen } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CourseCard } from "@/features/dashboard/course-card";
import type { CourseSummary } from "@/types/course";

export function CourseProjectList({ courses }: { courses: CourseSummary[] }) {
  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-white px-6 py-14 text-center">
        <FolderOpen className="mx-auto size-10 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-[#273149]">还没有课程项目</h3>
        <p className="mt-2 text-sm text-muted-foreground">创建第一门课程，AI 蓝图和后续编辑都会保存在当前设备。</p>
        <Button asChild className="mt-5"><Link href="/courses/new">新建课程</Link></Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => <CourseCard key={course.id} course={course} />)}
    </div>
  );
}

