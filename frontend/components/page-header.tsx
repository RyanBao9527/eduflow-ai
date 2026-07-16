import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b bg-white px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-white md:hidden">
          <Sparkles className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.025em] text-[#172033] sm:text-[30px]">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild>
          <Link href="/courses/new">
            <Plus className="size-4" />
            新建课程
          </Link>
        </Button>
      </div>
    </header>
  );
}
