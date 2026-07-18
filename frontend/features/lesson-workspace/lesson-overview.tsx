import { BookOpenCheck, Clock3, Layers3, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CoursePlan } from "@/features/course-generation/course-plan-schema";

type Lesson = CoursePlan["lessonIndex"][number];
type CourseModule = CoursePlan["modules"][number];

export function LessonOverview({
  lesson,
  courseModule,
}: {
  lesson: Lesson;
  courseModule: CourseModule;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{lesson.lessonId}</Badge>
          <Badge variant="secondary">第 {lesson.lessonNumber} 课</Badge>
        </div>
        <CardTitle className="mt-3 text-xl sm:text-2xl">{lesson.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 pt-6 md:grid-cols-2">
        <section className="flex items-start gap-3 md:col-span-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f2f5ff] text-primary">
            <Target className="size-[18px]" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[#273149]">教学目标</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{lesson.objective}</p>
          </div>
        </section>

        <section className="flex items-start gap-3 rounded-xl border bg-slate-50/70 p-4">
          <Layers3 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-[#273149]">所属模块</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {courseModule.title} · {courseModule.moduleId}
            </p>
          </div>
        </section>

        <section className="flex items-start gap-3 rounded-xl border bg-slate-50/70 p-4">
          <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-[#273149]">课时信息</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {lesson.durationMinutes} 分钟 · {lesson.lessonId}
            </p>
          </div>
        </section>

        <section className="flex items-start gap-3 md:col-span-2">
          <BookOpenCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-[#273149]">核心知识点</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {lesson.keyConcepts.length > 0 ? (
                lesson.keyConcepts.map((concept) => (
                  <Badge key={concept} variant="outline">{concept}</Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">暂未提供</span>
              )}
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
