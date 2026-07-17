import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CoursePlan } from "@/features/course-generation/course-plan-schema";

export function LessonList({
  plan,
  isEditing,
  onLessonChange,
}: {
  plan: CoursePlan;
  isEditing: boolean;
  onLessonChange: (lessonId: string, field: "title" | "objective", value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>课时列表</CardTitle>
        <p className="text-sm text-muted-foreground">结构 ID、顺序和模块归属保持只读。</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {plan.lessonIndex.map((lesson) => (
          <section key={lesson.lessonId} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{lesson.lessonId}</Badge>
              <Badge variant="secondary">{lesson.moduleId}</Badge>
              <span className="text-xs text-muted-foreground">第 {lesson.lessonNumber} 课 · {lesson.durationMinutes} 分钟</span>
            </div>
            {isEditing ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <Label htmlFor={`lesson-title-${lesson.lessonId}`}>课时标题</Label>
                  <Input
                    id={`lesson-title-${lesson.lessonId}`}
                    className="mt-2"
                    value={lesson.title}
                    onChange={(event) => onLessonChange(lesson.lessonId, "title", event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`lesson-description-${lesson.lessonId}`}>课时描述</Label>
                  <Textarea
                    id={`lesson-description-${lesson.lessonId}`}
                    className="mt-2 min-h-20"
                    value={lesson.objective}
                    onChange={(event) => onLessonChange(lesson.lessonId, "objective", event.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <h3 className="font-semibold text-[#273149]">{lesson.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{lesson.objective}</p>
              </div>
            )}
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

