import { AppSidebar } from "@/components/app-sidebar";
import { CourseWorkspace } from "@/features/course-workspace/course-workspace";

export default async function CourseWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <CourseWorkspace projectId={id} />
    </div>
  );
}

