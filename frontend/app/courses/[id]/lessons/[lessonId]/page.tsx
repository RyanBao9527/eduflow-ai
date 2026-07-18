import { AppSidebar } from "@/components/app-sidebar";
import { LessonWorkspace } from "@/features/lesson-workspace/lesson-workspace";

export default async function LessonWorkspacePage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <LessonWorkspace projectId={id} lessonId={lessonId} />
    </div>
  );
}
