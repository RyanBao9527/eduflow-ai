import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CoursePlan } from "@/features/course-generation/course-plan-schema";
import { LessonSummaryCard } from "@/features/course-workspace/lesson-summary-card";

export function LessonList({
  plan,
  projectId,
  isEditing,
  onLessonChange,
}: {
  plan: CoursePlan;
  projectId: string;
  isEditing: boolean;
  onLessonChange: (lessonId: string, field: "title" | "objective", value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>课时列表</CardTitle>
        <p className="text-sm text-muted-foreground">
          查看课程结构与资源进度，进入单课工作台完成备课。
        </p>
        {isEditing && (
          <p role="status" className="text-sm font-medium text-amber-700">
            请先保存课程修改，再进入课时备课。
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {plan.lessonIndex.map((lesson) => {
          const courseModule = plan.modules.find((module) => module.moduleId === lesson.moduleId);
          return (
            <LessonSummaryCard
              key={lesson.lessonId}
              lesson={lesson}
              moduleTitle={courseModule?.title ?? lesson.moduleId}
              projectId={projectId}
              isEditing={isEditing}
              onLessonChange={onLessonChange}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
