import { Check, CloudOff, LoaderCircle, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

export type DraftSaveState = "idle" | "saving" | "saved" | "restored" | "error";

const statusConfig = {
  idle: { icon: Check, label: "本地草稿已启用", className: "text-muted-foreground" },
  saving: { icon: LoaderCircle, label: "正在保存草稿", className: "text-primary" },
  saved: { icon: Check, label: "草稿已保存", className: "text-emerald-700" },
  restored: { icon: RotateCcw, label: "已恢复上次草稿", className: "text-primary" },
  error: { icon: CloudOff, label: "草稿暂时无法保存", className: "text-amber-700" },
};

export function DraftStatus({ state }: { state: DraftSaveState }) {
  const config = statusConfig[state];
  const Icon = config.icon;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-medium", config.className)}
      role="status"
      aria-live="polite"
    >
      <Icon className={cn("size-3.5", state === "saving" && "animate-spin")} />
      {config.label}
    </span>
  );
}
