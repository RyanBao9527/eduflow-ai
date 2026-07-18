import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  createResourceArtifactVersion,
  RESOURCE_ARTIFACT_STORAGE_KEY,
} from "@/features/course-resources/resource-artifact-storage";
import { CourseWorkspace } from "@/features/course-workspace/course-workspace";
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

function addSecondLesson(project: ReturnType<typeof createGeneratedProject>) {
  const secondLesson = {
    lessonId: "L002",
    moduleId: "M01",
    lessonNumber: 2,
    title: "编写第一个循环",
    objective: "使用循环完成重复任务",
    keyConcepts: ["循环"],
    durationMinutes: 45,
  };
  return saveCourseProject(window.localStorage, {
    ...project,
    courseBrief: { ...project.courseBrief, lessonCount: 2 },
    coursePlan: {
      ...project.coursePlan!,
      modules: project.coursePlan!.modules.map((module) => ({
        ...module,
        lessonIds: [...module.lessonIds, "L002"],
      })),
      lessonIndex: [...project.coursePlan!.lessonIndex, secondLesson],
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

describe("Course Workspace lesson navigation", () => {
  it("shows a lesson preparation link and empty resource summaries without calling AI", async () => {
    const project = createGeneratedProject();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<CourseWorkspace projectId={project.id} />);

    const lesson = await screen.findByRole("region", { name: "L001 课时摘要" });
    expect(within(lesson).getByText("教师教案 · 未生成")).toBeInTheDocument();
    expect(within(lesson).getByText("PPT结构 · 未生成")).toBeInTheDocument();
    expect(within(lesson).getByText("循环入门 · M01 · 45 分钟")).toBeInTheDocument();
    expect(within(lesson).getByRole("link", { name: "进入备课" })).toHaveAttribute(
      "href",
      `/courses/${project.id}/lessons/L001`,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /生成教师教案|生成PPT结构/ })).not.toBeInTheDocument();
  });

  it("shows ready resource summaries without rendering resource content", async () => {
    const project = createGeneratedProject();
    createResourceArtifactVersion(window.localStorage, {
      courseProjectId: project.id,
      moduleId: "M01",
      lessonId: "L001",
      resourceType: "lesson_plan",
      title: "课程页不应展示的教案标题",
      sourceProjectUpdatedAt: project.updatedAt,
      generation: resourceGenerationMetadata,
      content: makeLessonPlanContent("课程页不应展示的教案正文"),
    });
    createResourceArtifactVersion(window.localStorage, {
      courseProjectId: project.id,
      moduleId: "M01",
      lessonId: "L001",
      resourceType: "slide_outline",
      title: "课程页不应展示的PPT标题",
      sourceProjectUpdatedAt: project.updatedAt,
      generation: resourceGenerationMetadata,
      content: makeSlideOutlineContent("课程页不应展示的PPT正文"),
    });

    render(<CourseWorkspace projectId={project.id} />);

    const lesson = await screen.findByRole("region", { name: "L001 课时摘要" });
    expect(within(lesson).getByText("教师教案 · 已生成")).toBeInTheDocument();
    expect(within(lesson).getByText("PPT结构 · 已生成")).toBeInTheDocument();
    expect(screen.queryByText("课程页不应展示的教案正文")).not.toBeInTheDocument();
    expect(screen.queryByText("课程页不应展示的PPT正文")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "教师教案结果" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "PPT课件结构结果" })).not.toBeInTheDocument();
  });

  it("keeps lesson plan and PPT summary states independent", async () => {
    const project = createGeneratedProject();
    createResourceArtifactVersion(window.localStorage, {
      courseProjectId: project.id,
      moduleId: "M01",
      lessonId: "L001",
      resourceType: "lesson_plan",
      title: "已有教师教案",
      sourceProjectUpdatedAt: project.updatedAt,
      generation: resourceGenerationMetadata,
      content: makeLessonPlanContent(),
    });

    render(<CourseWorkspace projectId={project.id} />);

    const lesson = await screen.findByRole("region", { name: "L001 课时摘要" });
    expect(within(lesson).getByText("教师教案 · 已生成")).toBeInTheDocument();
    expect(within(lesson).getByText("PPT结构 · 未生成")).toBeInTheDocument();
  });

  it("keeps the course available when the resource cache is corrupted", async () => {
    const project = createGeneratedProject();
    window.localStorage.setItem(RESOURCE_ARTIFACT_STORAGE_KEY, "{invalid-resource-cache");

    render(<CourseWorkspace projectId={project.id} />);

    expect(await screen.findByRole("heading", { name: project.title })).toBeInTheDocument();
    const lesson = screen.getByRole("region", { name: "L001 课时摘要" });
    expect(within(lesson).getByText("教师教案 · 未生成")).toBeInTheDocument();
    expect(within(lesson).getByRole("link", { name: "进入备课" })).toHaveAttribute(
      "href",
      `/courses/${project.id}/lessons/L001`,
    );
  });

  it("keeps resource summaries and navigation isolated by lesson", async () => {
    const project = addSecondLesson(createGeneratedProject());
    createResourceArtifactVersion(window.localStorage, {
      courseProjectId: project.id,
      moduleId: "M01",
      lessonId: "L002",
      resourceType: "lesson_plan",
      title: "第二课教师教案",
      sourceProjectUpdatedAt: project.updatedAt,
      generation: resourceGenerationMetadata,
      content: makeLessonPlanContent(),
    });

    render(<CourseWorkspace projectId={project.id} />);

    const firstLesson = await screen.findByRole("region", { name: "L001 课时摘要" });
    const secondLesson = screen.getByRole("region", { name: "L002 课时摘要" });
    expect(within(firstLesson).getByText("教师教案 · 未生成")).toBeInTheDocument();
    expect(within(secondLesson).getByText("教师教案 · 已生成")).toBeInTheDocument();
    expect(within(firstLesson).getByRole("link", { name: "进入备课" })).toHaveAttribute(
      "href",
      `/courses/${project.id}/lessons/L001`,
    );
    expect(within(secondLesson).getByRole("link", { name: "进入备课" })).toHaveAttribute(
      "href",
      `/courses/${project.id}/lessons/L002`,
    );
  });

  it("blocks lesson workspace navigation while course changes are unsaved", async () => {
    const user = userEvent.setup();
    const project = createGeneratedProject();
    render(<CourseWorkspace projectId={project.id} />);

    await screen.findByRole("region", { name: "L001 课时摘要" });
    await user.click(screen.getByRole("button", { name: "编辑课程" }));
    await user.clear(screen.getByLabelText("课时标题"));
    await user.type(screen.getByLabelText("课时标题"), "尚未保存的新标题");

    expect(screen.getByRole("button", { name: "进入备课" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "进入备课" })).not.toBeInTheDocument();
    expect(screen.getByText("请先保存课程修改，再进入课时备课。")).toBeInTheDocument();
  });
});
