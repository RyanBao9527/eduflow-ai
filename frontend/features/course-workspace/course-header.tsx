import { ArrowLeft, Pencil, Save, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CourseProjectStatus } from "@/features/course-workspace/course-project-schema";
import { SaveIndicator, type WorkspaceSaveState } from "@/features/course-workspace/save-indicator";

const statusLabels: Record<CourseProjectStatus, string> = {
  draft: "草稿",
  generated: "已生成",
  editing: "已编辑",
};

export function CourseHeader({
  title,
  status,
  isEditing,
  saveState,
  onBack,
  onEdit,
  onSave,
  onCancel,
}: {
  title: string;
  status: CourseProjectStatus;
  isEditing: boolean;
  saveState: WorkspaceSaveState;
  onBack: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <header className="border-b bg-white px-5 py-5 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            <ArrowLeft className="size-3.5" />返回 Dashboard
          </button>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-[-0.03em] text-[#172033]">{title}</h1>
            <Badge variant="outline">{statusLabels[status]}</Badge>
          </div>
          <div className="mt-2"><SaveIndicator state={saveState} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={onCancel}><X className="size-4" />取消</Button>
              <Button onClick={onSave}><Save className="size-4" />保存</Button>
            </>
          ) : (
            <Button onClick={onEdit}><Pencil className="size-4" />编辑课程</Button>
          )}
        </div>
      </div>
    </header>
  );
}

