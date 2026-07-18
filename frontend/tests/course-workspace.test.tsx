import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CourseWorkspace } from "@/features/course-workspace/course-workspace";
import {
  attachGenerationToProject,
  createDraftCourseProject,
  finalizeCourseProject,
  getCourseProject,
} from "@/features/course-workspace/course-project-storage";
import { makeCourseResponse, validCourseBrief } from "./course-generation-fixtures";

function createGeneratedProject() {
  const draft = createDraftCourseProject(window.localStorage, validCourseBrief);
  attachGenerationToProject(
    window.localStorage,
    draft.id,
    validCourseBrief,
    makeCourseResponse("runtime-provider", "runtime-model"),
  );
  return finalizeCourseProject(window.localStorage, draft.id);
}

describe("CourseWorkspace", () => {
  it("edits only supported text fields and persists the project as editing", async () => {
    const user = userEvent.setup();
    const project = createGeneratedProject();
    const originalModuleIds = project.coursePlan!.modules.map((module) => module.moduleId);
    const originalLessonIds = project.coursePlan!.lessonIndex.map((lesson) => lesson.lessonId);

    render(<CourseWorkspace projectId={project.id} />);

    expect(await screen.findByRole("heading", { name: "Python 编程启蒙" })).toBeInTheDocument();
    expect(screen.getByText("runtime-provider · runtime-model · course-blueprint-v3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "编辑课程" }));
    await user.clear(screen.getByLabelText("课程标题"));
    await user.type(screen.getByLabelText("课程标题"), "Python 循环实践课");
    await user.clear(screen.getByLabelText("课程总体目标"));
    await user.type(screen.getByLabelText("课程总体目标"), "能够使用循环独立完成真实编程任务");
    await user.clear(screen.getByLabelText("模块名称"));
    await user.type(screen.getByLabelText("模块名称"), "循环核心基础");
    await user.clear(screen.getByLabelText("课时标题"));
    await user.type(screen.getByLabelText("课时标题"), "发现重复与循环");
    await user.clear(screen.getByLabelText("课时描述"));
    await user.type(screen.getByLabelText("课时描述"), "识别重复模式并说明循环的价值");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByRole("heading", { name: "Python 循环实践课" })).toBeInTheDocument();
    expect(screen.getByText("已编辑")).toBeInTheDocument();
    const saved = getCourseProject(window.localStorage, project.id)!;
    expect(saved.status).toBe("editing");
    expect(saved.courseBrief.overallGoal).toBe("能够使用循环独立完成真实编程任务");
    expect(saved.coursePlan?.modules[0].title).toBe("循环核心基础");
    expect(saved.coursePlan?.lessonIndex[0]).toMatchObject({
      title: "发现重复与循环",
      objective: "识别重复模式并说明循环的价值",
    });
    expect(saved.coursePlan?.modules.map((module) => module.moduleId)).toEqual(originalModuleIds);
    expect(saved.coursePlan?.lessonIndex.map((lesson) => lesson.lessonId)).toEqual(originalLessonIds);
    expect(screen.getByRole("link", { name: "进入备课" })).toHaveAttribute(
      "href",
      `/courses/${project.id}/lessons/L001`,
    );
    expect(screen.queryByRole("button", { name: "生成教师教案" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "生成PPT结构" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /下载|导出/ })).not.toBeInTheDocument();
  });

  it("cancels local changes without writing them", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const project = createGeneratedProject();

    render(<CourseWorkspace projectId={project.id} />);
    await screen.findByRole("heading", { name: project.title });
    await user.click(screen.getByRole("button", { name: "编辑课程" }));
    await user.clear(screen.getByLabelText("课程标题"));
    await user.type(screen.getByLabelText("课程标题"), "未保存标题");
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(screen.getByRole("heading", { name: project.title })).toBeInTheDocument();
    expect(getCourseProject(window.localStorage, project.id)?.status).toBe("generated");
    confirm.mockRestore();
  });

  it("shows a safe error for a missing project", async () => {
    render(<CourseWorkspace projectId="missing-project" />);

    expect(await screen.findByRole("heading", { name: "课程项目不可用" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回 Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建课程" })).toBeInTheDocument();
  });
});
