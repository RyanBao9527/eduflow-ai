import {
  BookOpenText,
  Boxes,
  CheckCircle2,
  Pencil,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardMetric } from "@/types/course";

const metricStyles = {
  blue: {
    icon: BookOpenText,
    className: "bg-[#e8efff] text-[#3157d5]",
  },
  green: {
    icon: Boxes,
    className: "bg-[#e4f6ef] text-[#16845b]",
  },
  violet: {
    icon: CheckCircle2,
    className: "bg-[#f0eafe] text-[#7652bd]",
  },
  amber: {
    icon: Pencil,
    className: "bg-[#fff1d9] text-[#a9670a]",
  },
};

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  const style = metricStyles[metric.tone];
  const Icon = style.icon;

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
          <p className="mt-2 text-[30px] font-bold tracking-[-0.04em] text-[#172033]">
            {metric.value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{metric.change}</p>
        </div>
        <div className={cn("grid size-11 place-items-center rounded-xl", style.className)}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}
