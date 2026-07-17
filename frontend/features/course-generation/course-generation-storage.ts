import type { CourseBrief } from "@/features/course-wizard/course-brief-schema";
import {
  storedCourseGenerationSchema,
  type CoursePlanGenerateResponse,
  type StoredCourseGeneration,
} from "@/features/course-generation/course-plan-schema";

export const COURSE_GENERATION_STORAGE_KEY = "eduflow.course-generation.result.v1";

let inMemoryGeneration: StoredCourseGeneration | null = null;

export function saveCourseGeneration(
  storage: Storage,
  brief: CourseBrief,
  response: CoursePlanGenerateResponse,
) {
  const value = storedCourseGenerationSchema.parse({
    version: 1,
    brief,
    response,
    savedAt: new Date().toISOString(),
  });
  inMemoryGeneration = value;
  try {
    storage.setItem(COURSE_GENERATION_STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadCourseGeneration(storage: Storage): StoredCourseGeneration | null {
  try {
    const raw = storage.getItem(COURSE_GENERATION_STORAGE_KEY);
    if (!raw) return inMemoryGeneration;
    const parsed = storedCourseGenerationSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      storage.removeItem(COURSE_GENERATION_STORAGE_KEY);
      return inMemoryGeneration;
    }
    inMemoryGeneration = parsed.data;
    return parsed.data;
  } catch {
    try {
      storage.removeItem(COURSE_GENERATION_STORAGE_KEY);
    } catch {
      // Ignore storage cleanup failures in restricted browser modes.
    }
    return inMemoryGeneration;
  }
}

export function clearCourseGeneration(storage: Storage) {
  inMemoryGeneration = null;
  try {
    storage.removeItem(COURSE_GENERATION_STORAGE_KEY);
  } catch {
    // In-memory state is still cleared when browser storage is unavailable.
  }
}
