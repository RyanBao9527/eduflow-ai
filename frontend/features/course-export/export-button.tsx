"use client";

import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ExportButton({
  label,
  pending,
  disabled,
  onClick,
}: {
  label: string;
  pending: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled || pending}
      onClick={onClick}
    >
      {pending
        ? <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        : <Download className="size-4" aria-hidden="true" />}
      {pending ? "正在导出…" : label}
    </Button>
  );
}
