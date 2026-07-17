import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CoursePlan } from "@/features/course-generation/course-plan-schema";

export function ModuleEditor({
  plan,
  isEditing,
  onTitleChange,
}: {
  plan: CoursePlan;
  isEditing: boolean;
  onTitleChange: (moduleId: string, value: string) => void;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>课程模块</CardTitle></CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        {plan.modules.map((module) => (
          <section key={module.moduleId} className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <>
                    <Label htmlFor={`module-${module.moduleId}`}>模块名称</Label>
                    <Input
                      id={`module-${module.moduleId}`}
                      className="mt-2"
                      value={module.title}
                      onChange={(event) => onTitleChange(module.moduleId, event.target.value)}
                    />
                  </>
                ) : (
                  <h3 className="font-semibold text-[#273149]">{module.title}</h3>
                )}
              </div>
              <Badge variant="outline">{module.moduleId}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{module.goal}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {module.keyConcepts.map((concept) => <Badge key={concept} variant="secondary">{concept}</Badge>)}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

