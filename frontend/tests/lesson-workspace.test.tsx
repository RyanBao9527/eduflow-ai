import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LessonWorkspace } from "@/features/lesson-workspace/lesson-workspace";
import {
  attachGenerationToProject,
  createDraftCourseProject,
  finalizeCourseProject,
} from "@/features/course-workspace/course-project-storage";
import { makeCourseResponse, validCourseBrief } from "./course-generation-fixtures";

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

describe("LessonWorkspace", () => {
  it("reads the lesson and its module from a saved CourseProject", async () => {
    const project = createGeneratedProject();

    render(<LessonWorkspace projectId={project.id} lessonId="L001" />);

    expect(await screen.findByRole("heading", { name: "认识重复任务", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Python 编程启蒙", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("第 1 课")).toBeInTheDocument();
    expect(screen.getByText("识别生活中的重复行为")).toBeInTheDocument();
    expect(screen.getByText("循环入门 · M01")).toBeInTheDocument();
    expect(screen.getByText("45 分钟 · L001")).toBeInTheDocument();
    expect(screen.getByText("重复")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回课程" })).toHaveAttribute(
      "href",
      `/courses/${project.id}`,
    );
    expect(screen.getByRole("heading", { name: "教学资源" })).toBeInTheDocument();
    expect(screen.getByText("教师教案")).toBeInTheDocument();
    expect(screen.getByText("PPT课件结构")).toBeInTheDocument();
    expect(screen.queryByText("备课状态")).not.toBeInTheDocument();
  });

  it("shows a safe error when the lesson does not exist", async () => {
    const project = createGeneratedProject();

    render(<LessonWorkspace projectId={project.id} lessonId="L999" />);

    expect(await screen.findByRole("heading", { name: "课时不存在" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回课程" })).toHaveAttribute(
      "href",
      `/courses/${project.id}`,
    );
  });

  it("shows a safe error when the project does not exist", async () => {
    render(<LessonWorkspace projectId="missing-project" lessonId="L001" />);

    expect(await screen.findByRole("heading", { name: "课程项目不可用" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回 Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("blocks draft projects from entering the lesson workspace", async () => {
    const draft = createDraftCourseProject(window.localStorage, validCourseBrief);

    render(<LessonWorkspace projectId={draft.id} lessonId="L001" />);

    expect(
      await screen.findByRole("heading", { name: "课程尚未完成，无法进入备课" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("认识重复任务")).not.toBeInTheDocument();
  });
});
