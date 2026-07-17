"use client";

import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Plus,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigationItems = [
  { label: "工作台", icon: LayoutDashboard, href: "/dashboard" },
  { label: "我的课程", icon: BookOpenText, href: "/dashboard#course-projects" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden min-h-screen shrink-0 border-r bg-[#101d3a] text-white transition-[width] duration-200 md:flex md:flex-col",
        collapsed ? "w-[84px]" : "w-[240px]",
      )}
    >
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#5b7cfa] shadow-[0_8px_24px_rgba(91,124,250,0.35)]">
          <Sparkles className="size-5" aria-hidden="true" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-[17px] font-bold tracking-tight">EduFlow AI</p>
            <p className="mt-0.5 text-[11px] text-white/50">课程研发工作台</p>
          </div>
        )}
      </div>

      <div className="p-3">
        <Button
          asChild
          className={cn(
            "w-full bg-[#5b7cfa] text-white hover:bg-[#6b89ff]",
            collapsed ? "px-0" : "justify-start",
          )}
          aria-label="新建课程"
        >
          <Link href="/courses/new">
            <Plus className="size-4" aria-hidden="true" />
            {!collapsed && "新建课程"}
          </Link>
        </Button>
      </div>

      <nav className="flex-1 px-3 py-2" aria-label="主导航">
        <p
          className={cn(
            "mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35",
            collapsed && "sr-only",
          )}
        >
          Workspace
        </p>
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.label}
              title={item.label}
              href={item.href}
              className={cn(
                "flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors",
                "text-white/70 hover:bg-white/10 hover:text-white",
                collapsed && "justify-center px-0",
              )}
            >
              <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
              {!collapsed && item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        {!collapsed && (
          <div className="mb-3 rounded-xl bg-white/6 p-3">
            <p className="text-xs font-semibold text-white/80">Sprint 4</p>
            <p className="mt-1 text-[11px] leading-5 text-white/45">
              课程项目可在当前设备保存、打开并持续编辑。
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="flex h-10 w-full items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/8 hover:text-white"
          aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
