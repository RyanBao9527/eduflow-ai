import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CourseWizard } from "@/features/course-wizard/course-wizard";
import {
  COURSE_WIZARD_SAVE_DELAY_MS,
  saveCourseWizardDraft,
} from "@/features/course-wizard/draft-storage";
import { listCourseProjects } from "@/features/course-workspace/course-project-storage";
import { validCourseBrief } from "./course-generation-fixtures";

describe("CourseWizard", () => {
  it("does not restart autosave when only the save status changes", async () => {
    const user = userEvent.setup();
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "基础信息" });
    await user.type(screen.getByLabelText("课程名称"), "企业培训课程");
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
    expect(screen.queryByRole("heading", { name: "学员类型" })).not.toBeInTheDocument();
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

    expect(await screen.findByRole("heading", { name: "学员类型" })).toBeInTheDocument();
    expect(screen.getByLabelText("学员类型")).toHaveAttribute(
      "placeholder",
      "例如：小学生 / 大学生 / 教师 / 企业员工 / 职场人士",
    );
    expect(screen.getByText("描述课程面向的人群。")).toBeInTheDocument();
    expect(screen.getByLabelText("年龄/教育阶段")).toHaveAttribute(
      "placeholder",
      "例如：8-10岁 / 小学高年级 / 初中阶段 / 成人",
    );
    expect(screen.getByLabelText("学员基础")).toHaveAttribute(
      "placeholder",
      "例如：零基础 / 有相关学习经验 / 已掌握基础知识 / 有项目实践经验",
    );
    expect(screen.getByDisplayValue("10–12 岁零基础学生")).toBeInTheDocument();
  });

  it("restores an old draft over 50 lessons but requires the user to reduce it", async () => {
    const user = userEvent.setup();
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 3,
      values: {
        lessonDurationMinutes: 45,
        lessonCount: 51,
        difficulty: "beginner",
        teachingStyles: ["互动式"],
        overallGoal: "建立完整且可持续扩展的课程学习路径",
      },
      status: "draft",
    });

    render(<CourseWizard />);

    expect(await screen.findByRole("heading", { name: "课程规划与教学风格" })).toBeInTheDocument();
    expect(screen.getByLabelText("课时数量")).toHaveValue(51);
    await user.click(screen.getByRole("button", { name: "下一步" }));
    expect((await screen.findAllByText("课程蓝图最多支持 50 个课时")).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "课程规划与教学风格" })).toBeInTheDocument();
  });

  it("describes resource choices as future planning", async () => {
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 4,
      values: { requestedResources: ["lesson_plan"] },
      status: "draft",
    });

    render(<CourseWizard />);

    expect(await screen.findByRole("heading", { name: "资源规划" })).toBeInTheDocument();
    expect(screen.getByText("后续课程资源规划")).toBeInTheDocument();
    expect(
      screen.getByText(
        "选择希望后续生成的教学资源类型。AI 将在课程蓝图中规划资源用途，具体资源内容将在后续资源中心单独生成。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Excel课程规划表")).toBeInTheDocument();
    expect(screen.getByText("课时、目标与资源规划")).toBeInTheDocument();
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

    await screen.findByRole("heading", { name: "学员类型" });
    await user.click(screen.getByRole("button", { name: "清除草稿" }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(await screen.findByRole("heading", { name: "基础信息" })).toBeInTheDocument();
    expect(screen.getByLabelText("课程名称")).toHaveValue("");
    expect(listCourseProjects(window.localStorage)).toHaveLength(0);
    confirmSpy.mockRestore();
  });

  it("prevents duplicate AI requests from repeated submit events", async () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 5,
      values: validCourseBrief,
      status: "submitted",
    });
    render(<CourseWizard />);

    const button = await screen.findByRole("button", { name: "AI 生成课程蓝图" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(await screen.findByRole("heading", { name: "AI 正在生成课程蓝图" })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    vi.unstubAllGlobals();
  });
});
