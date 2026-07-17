import { BookOpen, Clock3, Target, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CourseProject } from "@/features/course-workspace/course-project-schema";

export function CourseInfoEditor({
  project,
  isEditing,
  onTitleChange,
  onGoalChange,
}: {
  project: CourseProject;
  isEditing: boolean;
  onTitleChange: (value: string) => void;
  onGoalChange: (value: string) => void;
}) {
  if (!project.coursePlan) return null;
  const brief = project.courseBrief;

  return (
    <Card>
      <CardHeader>
        <CardTitle>课程信息</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label htmlFor="workspace-course-title">课程标题</Label>
          {isEditing ? (
            <Input id="workspace-course-title" className="mt-2" value={project.title} onChange={(event) => onTitleChange(event.target.value)} />
          ) : (
            <p className="mt-2 text-lg font-semibold text-[#273149]">{project.title}</p>
          )}
        </div>
        <div>
          <p className="text-sm font-medium">课程定位</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{project.coursePlan.positioning}</p>
        </div>
        <div>
          <Label htmlFor="workspace-overall-goal">课程总体目标</Label>
          {isEditing ? (
            <Textarea
              id="workspace-overall-goal"
              className="mt-2 min-h-28"
              value={brief.overallGoal ?? ""}
              onChange={(event) => onGoalChange(event.target.value)}
            />
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{brief.overallGoal}</p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Info icon={Users} label="目标学员" value={brief.targetLearners ?? "未设置"} />
          <Info icon={BookOpen} label="课时数量" value={`${brief.lessonCount ?? 0} 课时`} />
          <Info icon={Clock3} label="单课时长" value={`${brief.lessonDurationMinutes ?? 0} 分钟`} />
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/70 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Icon className="size-3.5" />{label}</p>
      <p className="mt-2 text-sm font-medium text-[#273149]">{value}</p>
    </div>
  );
}

