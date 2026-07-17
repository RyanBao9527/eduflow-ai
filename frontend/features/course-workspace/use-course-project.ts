"use client";

import { useEffect, useState } from "react";

import type { CourseProject } from "@/features/course-workspace/course-project-schema";
import { getCourseProject } from "@/features/course-workspace/course-project-storage";

export function useCourseProject(projectId: string) {
  const [project, setProject] = useState<CourseProject | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (!active) return;
      setProject(getCourseProject(window.localStorage, projectId));
      setHydrated(true);
    });
    return () => { active = false; };
  }, [projectId]);

  return { project, setProject, hydrated };
}

