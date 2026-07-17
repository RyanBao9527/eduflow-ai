import { AlertCircle, CheckCircle2, Cloud, LoaderCircle } from "lucide-react";

export type WorkspaceSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const config = {
  idle: { label: "已保存", icon: Cloud, className: "text-muted-foreground" },
  dirty: { label: "有未保存修改", icon: AlertCircle, className: "text-amber-700" },
  saving: { label: "正在保存", icon: LoaderCircle, className: "text-primary" },
  saved: { label: "保存成功", icon: CheckCircle2, className: "text-emerald-700" },
  error: { label: "保存失败", icon: AlertCircle, className: "text-red-700" },
};

export function SaveIndicator({ state }: { state: WorkspaceSaveState }) {
  const item = config[state];
  const Icon = item.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${item.className}`} aria-live="polite">
      <Icon className={`size-3.5 ${state === "saving" ? "animate-spin" : ""}`} aria-hidden="true" />
      {item.label}
    </span>
  );
}

