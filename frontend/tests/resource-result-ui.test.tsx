import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  createResourceArtifactVersion,
  RESOURCE_ARTIFACT_STORAGE_KEY,
} from "@/features/course-resources/resource-artifact-storage";
import { LessonWorkspace } from "@/features/lesson-workspace/lesson-workspace";
import {
  attachGenerationToProject,
  createDraftCourseProject,
  finalizeCourseProject,
  saveCourseProject,
} from "@/features/course-workspace/course-project-storage";
import { makeCourseResponse, validCourseBrief } from "./course-generation-fixtures";
import {
  makeLessonPlanContent,
  makeSlideOutlineContent,
  resourceGenerationMetadata,
} from "./resource-artifact-fixtures";

function createGeneratedProject() {
  const draft = createDraftCourseProject(window.localStorage, validCourseBrief);
  attachGenerationToProject(
    window.localStorage,
    draft.id,
    validCourseBrief,
    makeCourseResponse(),
  );
  return finalizeCourseProject(window.localStorage, draft.id);
}

function createTwoLessonProject() {
  const project = createGeneratedProject();
  return saveCourseProject(window.localStorage, {
    ...project,
    courseBrief: { ...project.courseBrief, lessonCount: 2 },
    coursePlan: {
      ...project.coursePlan!,
      modules: project.coursePlan!.modules.map((module) => ({
        ...module,
        lessonIds: [...module.lessonIds, "L002"],
      })),
      lessonIndex: [
        ...project.coursePlan!.lessonIndex,
        {
          lessonId: "L002",
          moduleId: "M01",
          lessonNumber: 2,
          title: "编写第一个循环",
          objective: "使用循环完成重复任务",
          keyConcepts: ["循环"],
          durationMinutes: 45,
        },
      ],
      lessonDetails: [
        ...("lessonDetails" in project.coursePlan! ? project.coursePlan!.lessonDetails : []),
        {
          lessonId: "L002",
          teachingActivities: ["编写循环"],
          assessmentMethod: "完成课堂任务",
        },
      ],
    },
  });
}

function createLessonPlan(projectId: string, lessonId = "L001", summary?: string) {
  return createResourceArtifactVersion(window.localStorage, {
    courseProjectId: projectId,
    moduleId: "M01",
    lessonId,
    resourceType: "lesson_plan",
    title: `${lessonId} 教师教案`,
    sourceProjectUpdatedAt: "2026-07-17T09:00:00.000Z",
    generation: resourceGenerationMetadata,
    content: makeLessonPlanContent(summary),
  });
}

function createSlideOutline(projectId: string, lessonId = "L001", overview?: string) {
  return createResourceArtifactVersion(window.localStorage, {
    courseProjectId: projectId,
    moduleId: "M01",
    lessonId,
    resourceType: "slide_outline",
    title: `${lessonId} PPT课件结构`,
    sourceProjectUpdatedAt: "2026-07-17T09:00:00.000Z",
    generation: resourceGenerationMetadata,
    content: makeSlideOutlineContent(overview),
  });
}

describe("Resource Result UI", () => {
  it("shows a read-only generated lesson plan with metadata and token usage", async () => {
    const user = userEvent.setup();
    const project = createGeneratedProject();
    createLessonPlan(project.id);
    render(<LessonWorkspace projectId={project.id} lessonId="L001" />);

    await user.click(await screen.findByRole("button", { name: "查看教案" }));
    const result = await screen.findByRole("region", { name: "教师教案结果" });
    expect(within(result).getByText("L001 教师教案")).toBeInTheDocument();
    expect(within(result).getByText("通过生活案例认识循环结构。")).toBeInTheDocument();
    expect(within(result).getByText("provider-from-api · model-from-api")).toBeInTheDocument();
    expect(within(result).getByText(/Token：300/)).toBeInTheDocument();
    expect(within(result).getByText("最新版本 · v1")).toBeInTheDocument();
    expect(within(result).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(result).queryByRole("button", { name: /下载|导出|分享|发布/ })).not.toBeInTheDocument();
  });

  it("shows safe empty states without rendering a result panel", async () => {
    const project = createGeneratedProject();
    render(<LessonWorkspace projectId={project.id} lessonId="L001" />);

    expect(await screen.findByRole("button", { name: "生成教案" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成PPT结构" })).toBeInTheDocument();
    expect(screen.getAllByText("未生成")).toHaveLength(2);
    expect(screen.queryByRole("region", { name: "教师教案结果" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "PPT课件结构结果" })).not.toBeInTheDocument();
  });

  it("keeps lesson plan and slide outline result content isolated", async () => {
    const user = userEvent.setup();
    const project = createGeneratedProject();
    createLessonPlan(project.id, "L001", "教案专属内容");
    createSlideOutline(project.id, "L001", "PPT专属内容");
    render(<LessonWorkspace projectId={project.id} lessonId="L001" />);

    await user.click(await screen.findByRole("button", { name: "查看教案" }));
    const lessonPlan = await screen.findByRole("region", { name: "教师教案结果" });
    expect(within(lessonPlan).getByText("教案专属内容")).toBeInTheDocument();
    expect(within(lessonPlan).queryByText("PPT专属内容")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "查看PPT结构" }));
    const slides = await screen.findByRole("region", { name: "PPT课件结构结果" });
    expect(within(slides).getByText("PPT专属内容")).toBeInTheDocument();
    expect(within(slides).queryByText("教案专属内容")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "教师教案结果" })).not.toBeInTheDocument();
  });

  it("keeps resource results isolated between lessons", async () => {
    const user = userEvent.setup();
    const project = createTwoLessonProject();
    createLessonPlan(project.id, "L001", "第一课教案内容");
    createLessonPlan(project.id, "L002", "第二课教案内容");
    const firstWorkspace = render(<LessonWorkspace projectId={project.id} lessonId="L001" />);

    await user.click(await screen.findByRole("button", { name: "查看教案" }));
    expect(screen.getByText("第一课教案内容")).toBeInTheDocument();
    expect(screen.queryByText("第二课教案内容")).not.toBeInTheDocument();

    firstWorkspace.unmount();
    render(<LessonWorkspace projectId={project.id} lessonId="L002" />);
    await user.click(await screen.findByRole("button", { name: "查看教案" }));
    expect(screen.getByText("第二课教案内容")).toBeInTheDocument();
    expect(screen.queryByText("第一课教案内容")).not.toBeInTheDocument();
  });

  it("defaults to the ready version and allows read-only historical version viewing", async () => {
    const user = userEvent.setup();
    const project = createGeneratedProject();
    createLessonPlan(project.id, "L001", "第一版教案内容");
    createLessonPlan(project.id, "L001", "第二版教案内容");
    render(<LessonWorkspace projectId={project.id} lessonId="L001" />);

    await user.click(await screen.findByRole("button", { name: "查看教案" }));
    const result = await screen.findByRole("region", { name: "教师教案结果" });
    expect(within(result).getByText("最新版本 · v2")).toBeInTheDocument();
    expect(within(result).getByText("第二版教案内容")).toBeInTheDocument();

    await user.click(within(result).getByRole("button", { name: "查看教师教案 v1" }));
    expect(within(result).getByText("历史版本 · v1")).toBeInTheDocument();
    expect(within(result).getByText("第一版教案内容")).toBeInTheDocument();
    expect(within(result).queryByText("第二版教案内容")).not.toBeInTheDocument();
  });

  it("filters a corrupted Artifact without hiding valid resource results", async () => {
    const user = userEvent.setup();
    const project = createGeneratedProject();
    createSlideOutline(project.id, "L001", "有效PPT结构");
    const envelope = JSON.parse(window.localStorage.getItem(RESOURCE_ARTIFACT_STORAGE_KEY)!);
    envelope.artifacts.push({
      schemaVersion: "1.0",
      resourceId: "broken-artifact",
      courseProjectId: project.id,
      lessonId: "L001",
      resourceType: "slide_outline",
      content: { overview: "损坏内容" },
    });
    window.localStorage.setItem(RESOURCE_ARTIFACT_STORAGE_KEY, JSON.stringify(envelope));
    render(<LessonWorkspace projectId={project.id} lessonId="L001" />);

    await user.click(await screen.findByRole("button", { name: "查看PPT结构" }));
    const result = await screen.findByRole("region", { name: "PPT课件结构结果" });
    expect(within(result).getByText("有效PPT结构")).toBeInTheDocument();
    expect(screen.queryByText("损坏内容")).not.toBeInTheDocument();
  });
});
