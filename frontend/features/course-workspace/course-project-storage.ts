import type { CoursePlanGenerateResponse } from "@/features/course-generation/course-plan-schema";
import type {
  CourseBrief,
  CourseBriefFormValues,
} from "@/features/course-wizard/course-brief-schema";
import {
  COURSE_PROJECT_SCHEMA_VERSION,
  courseProjectSchema,
  courseProjectStoreSchema,
  type CourseProject,
} from "@/features/course-workspace/course-project-schema";

export const COURSE_PROJECT_STORAGE_KEY = "eduflow.course-projects.v1";

export class CourseProjectStorageError extends Error {
  constructor(message = "课程项目无法保存到当前设备") {
    super(message);
    this.name = "CourseProjectStorageError";
  }
}

function createProjectId() {
  return globalThis.crypto?.randomUUID?.() ?? `course-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function readProjects(storage: Storage): CourseProject[] {
  try {
    const raw = storage.getItem(COURSE_PROJECT_STORAGE_KEY);
    if (!raw) return [];
    const envelope = courseProjectStoreSchema.parse(JSON.parse(raw));
    return envelope.projects.flatMap((value) => {
      const parsed = courseProjectSchema.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

function removeProjects(storage: Storage) {
  try {
    storage.removeItem(COURSE_PROJECT_STORAGE_KEY);
  } catch (error) {
    throw new CourseProjectStorageError(
      error instanceof Error ? `课程项目删除失败：${error.message}` : undefined,
    );
  }
}

function writeProjects(storage: Storage, projects: CourseProject[]) {
  const validated = projects.map((project) => courseProjectSchema.parse(project));
  try {
    storage.setItem(
      COURSE_PROJECT_STORAGE_KEY,
      JSON.stringify({ schemaVersion: COURSE_PROJECT_SCHEMA_VERSION, projects: validated }),
    );
  } catch (error) {
    throw new CourseProjectStorageError(
      error instanceof Error ? `课程项目保存失败：${error.message}` : undefined,
    );
  }
}

export function listCourseProjects(storage: Storage) {
  return readProjects(storage).sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
  );
}

export function getCourseProject(storage: Storage, id: string) {
  return readProjects(storage).find((project) => project.id === id) ?? null;
}

export function saveCourseProject(storage: Storage, project: CourseProject) {
  const parsed = courseProjectSchema.parse(project);
  const projects = readProjects(storage);
  const index = projects.findIndex((item) => item.id === parsed.id);
  if (index >= 0) projects[index] = parsed;
  else projects.push(parsed);
  writeProjects(storage, projects);
  return parsed;
}

export function createDraftCourseProject(
  storage: Storage,
  values: Partial<CourseBriefFormValues> = {},
  id = createProjectId(),
  wizardStep = 1,
) {
  const timestamp = nowIso();
  const project = courseProjectSchema.parse({
    schemaVersion: COURSE_PROJECT_SCHEMA_VERSION,
    id,
    title: values.courseTitle?.trim() || "未命名课程",
    status: "draft",
    wizardStep,
    courseBrief: values,
    coursePlan: null,
    generation: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return saveCourseProject(storage, project);
}

export function updateDraftCourseProject(
  storage: Storage,
  id: string,
  values: Partial<CourseBriefFormValues>,
  wizardStep = 1,
) {
  const project = getCourseProject(storage, id);
  if (!project) return createDraftCourseProject(storage, values, id, wizardStep);
  return saveCourseProject(storage, {
    ...project,
    title: values.courseTitle?.trim() || project.title || "未命名课程",
    wizardStep,
    courseBrief: values,
    updatedAt: nowIso(),
  });
}

export function attachGenerationToProject(
  storage: Storage,
  id: string,
  brief: CourseBrief,
  response: CoursePlanGenerateResponse,
) {
  const existing = getCourseProject(storage, id);
  if (!existing) throw new CourseProjectStorageError("找不到需要保存生成结果的课程项目");
  return saveCourseProject(storage, {
    ...existing,
    title: brief.courseTitle,
    status: "draft",
    wizardStep: 5,
    courseBrief: brief,
    coursePlan: response.coursePlan,
    generation: {
      requestId: response.requestId,
      ...response.generation,
    },
    updatedAt: nowIso(),
  });
}

export function finalizeCourseProject(storage: Storage, id: string) {
  const existing = getCourseProject(storage, id);
  if (!existing?.coursePlan || !existing.generation) {
    throw new CourseProjectStorageError("课程蓝图尚未完整生成，无法保存为课程项目");
  }
  return saveCourseProject(storage, {
    ...existing,
    status: "generated",
    updatedAt: nowIso(),
  });
}

export function saveEditedCourseProject(storage: Storage, project: CourseProject) {
  if (!project.coursePlan) throw new CourseProjectStorageError("课程项目缺少课程蓝图");
  const title = project.title.trim();
  return saveCourseProject(storage, {
    ...project,
    title,
    status: "editing",
    courseBrief: { ...project.courseBrief, courseTitle: title },
    coursePlan: { ...project.coursePlan, title },
    updatedAt: nowIso(),
  });
}

export function deleteCourseProject(storage: Storage, id: string) {
  const projects = readProjects(storage).filter((project) => project.id !== id);
  if (projects.length === 0) {
    removeProjects(storage);
    return;
  }
  writeProjects(storage, projects);
}
