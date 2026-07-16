import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CourseWizard } from "@/features/course-wizard/course-wizard";
import {
  COURSE_WIZARD_SAVE_DELAY_MS,
  saveCourseWizardDraft,
} from "@/features/course-wizard/draft-storage";

describe("CourseWizard", () => {
  it("does not restart autosave when only the save status changes", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "基础信息" });
    await waitFor(() => expect(setItemSpy).toHaveBeenCalledTimes(1));
    await new Promise((resolve) =>
      window.setTimeout(resolve, COURSE_WIZARD_SAVE_DELAY_MS + 100),
    );

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    setItemSpy.mockRestore();
  });

  it("blocks navigation when current-step validation fails", async () => {
    const user = userEvent.setup();
    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "基础信息" });
    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(await screen.findByText("请检查当前步骤")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "基础信息" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "目标学员" })).not.toBeInTheDocument();
  });

  it("restores a valid partial draft and its saved step", async () => {
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 2,
      values: {
        courseTitle: "Python for 循环闯关",
        subject: "编程启蒙",
        topic: "使用循环解决重复任务",
        teachingScenario: "offline",
        targetLearners: "10–12 岁零基础学生",
      },
      status: "draft",
    });

    render(<CourseWizard />);

    expect(await screen.findByRole("heading", { name: "目标学员" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("10–12 岁零基础学生")).toBeInTheDocument();
  });

  it("asks for confirmation before clearing the draft", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "基础信息" });
    await user.type(screen.getByLabelText("课程名称"), "企业培训课程");
    await user.click(screen.getByRole("button", { name: "清除草稿" }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(screen.getByDisplayValue("企业培训课程")).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("clears the saved values and returns to the first step after confirmation", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 2,
      values: {
        courseTitle: "企业培训课程",
        subject: "企业培训",
        topic: "沟通技巧",
        teachingScenario: "corporate",
        targetLearners: "新任管理者",
      },
      status: "draft",
    });

    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "目标学员" });
    await user.click(screen.getByRole("button", { name: "清除草稿" }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(await screen.findByRole("heading", { name: "基础信息" })).toBeInTheDocument();
    expect(screen.getByLabelText("课程名称")).toHaveValue("");
    expect(window.localStorage).toHaveLength(0);
    confirmSpy.mockRestore();
  });
});
