import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DashboardView } from "@/features/dashboard/dashboard-view";
import {
  attachGenerationToProject,
  createDraftCourseProject,
  finalizeCourseProject,
  saveEditedCourseProject,
} from "@/features/course-workspace/course-project-storage";
import { makeCourseResponse, validCourseBrief } from "./course-generation-fixtures";

describe("Course project dashboard flow", () => {
  it("continues to initialize when localStorage reads are blocked", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("storage blocked", "SecurityError");
    });

    render(<DashboardView />);

    expect(await screen.findByRole("heading", { name: "还没有课程项目" })).toBeInTheDocument();
    getItem.mockRestore();
  });

  it("routes draft, generated and edited projects to the correct continuation page", async () => {
    const draft = createDraftCourseProject(window.localStorage, {
      courseTitle: "待完成课程",
      subject: "数学",
    });
    const generatedDraft = createDraftCourseProject(window.localStorage, validCourseBrief);
    attachGenerationToProject(
      window.localStorage,
      generatedDraft.id,
      validCourseBrief,
      makeCourseResponse(),
    );
    const generated = finalizeCourseProject(window.localStorage, generatedDraft.id);
    const previewBrief = { ...validCourseBrief, courseTitle: "待确认蓝图" };
    const previewResponse = makeCourseResponse();
    previewResponse.coursePlan.title = previewBrief.courseTitle;
    const previewDraft = createDraftCourseProject(window.localStorage, previewBrief);
    const preview = attachGenerationToProject(
      window.localStorage,
      previewDraft.id,
      previewBrief,
      previewResponse,
    );
    const editingDraft = createDraftCourseProject(window.localStorage, {
      ...validCourseBrief,
      courseTitle: "已编辑课程",
    });
    const editingBrief = { ...validCourseBrief, courseTitle: "已编辑课程" };
    const editingResponse = makeCourseResponse();
    editingResponse.coursePlan.title = "已编辑课程";
    attachGenerationToProject(
      window.localStorage,
      editingDraft.id,
      editingBrief,
      editingResponse,
    );
    const editing = saveEditedCourseProject(
      window.localStorage,
      finalizeCourseProject(window.localStorage, editingDraft.id),
    );

    render(<DashboardView />);

    expect(await screen.findByRole("heading", { name: "待完成课程" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "继续填写" })).toHaveAttribute(
      "href",
      `/courses/new?projectId=${draft.id}`,
    );
    expect(screen.getByRole("link", { name: "查看蓝图" })).toHaveAttribute(
      "href",
      `/courses/result?projectId=${preview.id}`,
    );
    expect(
      screen.getAllByRole("link", { name: "打开课程" }).map((link) => link.getAttribute("href")),
    ).toEqual(expect.arrayContaining([`/courses/${generated.id}`, `/courses/${editing.id}`]));
    expect(screen.getAllByText("已生成")).not.toHaveLength(0);
    expect(screen.getAllByText("已编辑")).not.toHaveLength(0);
    expect(screen.queryByText("导出中心")).not.toBeInTheDocument();
  });

  it("confirms before deleting a project and updates the Dashboard without a refresh", async () => {
    const user = userEvent.setup();
    const first = createDraftCourseProject(window.localStorage, { courseTitle: "保留课程" });
    const second = createDraftCourseProject(window.localStorage, { courseTitle: "删除课程" });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<DashboardView />);

    expect(await screen.findByRole("heading", { name: "删除课程" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "更多操作：删除课程" }));
    expect(screen.getByRole("button", { name: "删除课程项目" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "删除课程项目" }));

    expect(confirm).toHaveBeenCalledWith("确定删除该课程项目吗？删除后无法恢复");
    expect(screen.getByRole("heading", { name: "删除课程" })).toBeInTheDocument();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "更多操作：删除课程" }));
    await user.click(screen.getByRole("button", { name: "删除课程项目" }));

    expect(screen.queryByRole("heading", { name: "删除课程" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "保留课程" })).toBeInTheDocument();
    expect(window.localStorage.getItem("eduflow.course-projects.v1")).toContain(first.id);
    expect(window.localStorage.getItem("eduflow.course-projects.v1")).not.toContain(second.id);
    confirm.mockRestore();
  });

  it("keeps the empty state after the last project is deleted and a Dashboard reload", async () => {
    const user = userEvent.setup();
    createDraftCourseProject(window.localStorage, { courseTitle: "唯一课程" });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    const { unmount } = render(<DashboardView />);
    await screen.findByRole("heading", { name: "唯一课程" });
    await user.click(screen.getByRole("button", { name: "更多操作：唯一课程" }));
    await user.click(screen.getByRole("button", { name: "删除课程项目" }));

    expect(await screen.findByRole("heading", { name: "还没有课程项目" })).toBeInTheDocument();
    unmount();
    render(<DashboardView />);
    expect(await screen.findByRole("heading", { name: "还没有课程项目" })).toBeInTheDocument();
    confirm.mockRestore();
  });

  it("keeps project cards visible and shows a safe error when deletion cannot be saved", async () => {
    const user = userEvent.setup();
    createDraftCourseProject(window.localStorage, { courseTitle: "保留课程" });
    createDraftCourseProject(window.localStorage, { courseTitle: "无法删除课程" });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    render(<DashboardView />);

    await screen.findByRole("heading", { name: "无法删除课程" });
    await user.click(screen.getByRole("button", { name: "更多操作：无法删除课程" }));
    await user.click(screen.getByRole("button", { name: "删除课程项目" }));

    expect(screen.getByRole("alert")).toHaveTextContent("课程项目删除失败");
    expect(screen.getByRole("heading", { name: "无法删除课程" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "保留课程" })).toBeInTheDocument();
    setItem.mockRestore();
    confirm.mockRestore();
  });
});
