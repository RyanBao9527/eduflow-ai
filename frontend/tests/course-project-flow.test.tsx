import { render, screen } from "@testing-library/react";
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
});
