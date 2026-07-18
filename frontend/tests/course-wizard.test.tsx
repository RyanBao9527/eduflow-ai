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

    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "课程想法" });
    await user.type(screen.getByLabelText("课程名称"), "企业培训课程");
    await waitFor(() => expect(listCourseProjects(window.localStorage)).toHaveLength(1));
    const firstSavedAt = listCourseProjects(window.localStorage)[0]?.updatedAt;
    await new Promise((resolve) =>
      window.setTimeout(resolve, COURSE_WIZARD_SAVE_DELAY_MS + 100),
    );

    expect(listCourseProjects(window.localStorage)[0]?.updatedAt).toBe(firstSavedAt);
  });

  it("blocks navigation when current-step validation fails", async () => {
    const user = userEvent.setup();
    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "课程想法" });
    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(await screen.findByText("请检查当前步骤")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "课程想法" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "学员画像" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("教学场景")).toBeInTheDocument();
  });

  it("offers local course recommendations and only fills blank fields", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "课程想法" });
    await user.type(screen.getByLabelText("课程名称"), "我的 Python 课程");
    await user.type(screen.getByLabelText("课程主题"), "Python");

    expect(screen.getByText("智能推荐")).toBeInTheDocument();
    expect(screen.getByText("本地规则生成，无需调用 AI。选择建议后仍可继续修改。")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Python/ })).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: /Python 少儿编程入门/ }));

    expect(screen.getByLabelText("课程名称")).toHaveValue("我的 Python 课程");
    expect(screen.getByLabelText("学科或领域")).toHaveValue("编程教育");
    expect(screen.getByLabelText("课程主题")).toHaveValue("Python");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
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
        ageOrGrade: "小学高年级",
        learnerLevel: "有基础编程体验",
        classSize: 24,
      },
      status: "draft",
    });

    render(<CourseWizard />);

    expect(await screen.findByRole("heading", { name: "学员画像" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "学员类型" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "年龄/教育阶段" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "学员基础" })).toBeInTheDocument();
    expect(screen.getByLabelText("学员类型自定义内容")).toHaveValue("10–12 岁零基础学生");
    expect(screen.getByLabelText("年龄/教育阶段自定义内容")).toHaveValue("小学高年级");
    expect(screen.getByLabelText("学员基础自定义内容")).toHaveValue("有基础编程体验");
    fireEvent.click(screen.getByText("更多设置"));
    expect(screen.getByLabelText("班级人数（可选）")).toHaveValue(24);
  });

  it("stores learner profile card selections in the existing CourseBrief fields", async () => {
    const user = userEvent.setup();
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 2,
      values: { courseTitle: "卡片选择测试" },
      status: "draft",
    });

    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "学员画像" });
    await user.click(screen.getByRole("radio", { name: "小学生" }));
    await user.click(screen.getByRole("radio", { name: "小学" }));
    await user.click(screen.getByRole("radio", { name: "零基础" }));

    expect(screen.getByRole("radio", { name: "小学生" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "小学" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "零基础" })).toHaveAttribute("aria-checked", "true");
    await waitFor(() => {
      expect(listCourseProjects(window.localStorage)[0]?.courseBrief).toMatchObject({
        targetLearners: "小学生",
        ageOrGrade: "小学",
        learnerLevel: "零基础",
      });
    });
  });

  it("fills local planning defaults when Step 3 is first opened", async () => {
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 3,
      values: {
        courseTitle: "Python 少儿编程",
        topic: "Python 基础语法",
        learnerLevel: "零基础",
      },
      status: "draft",
    });

    render(<CourseWizard />);

    expect(await screen.findByRole("heading", { name: "AI 规划" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "AI智能规划（推荐）" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByLabelText("希望学生学会什么？")).toHaveValue(
      "掌握Python 基础语法的核心知识，并能在实际任务中完成基础应用。",
    );
    expect(screen.getByLabelText("课时数量")).toHaveValue(8);
    expect(screen.getByLabelText("单课时长（分钟）")).toHaveValue(45);
    await waitFor(() => expect(screen.getByLabelText("课程难度")).toHaveTextContent("初级"));
    await waitFor(() => {
      expect(listCourseProjects(window.localStorage)[0]?.courseBrief).toMatchObject({
        lessonCount: 8,
        lessonDurationMinutes: 45,
        teachingScenario: "offline",
        difficulty: "beginner",
        teachingStyles: ["AI智能规划"],
      });
    });
  });

  it("stores a single teaching mode without changing the teachingStyles schema", async () => {
    const user = userEvent.setup();
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 3,
      values: {
        courseTitle: "项目课程",
        topic: "项目实践",
        learnerLevel: "入门",
      },
      status: "draft",
    });

    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "AI 规划" });
    await user.click(screen.getByRole("radio", { name: "项目制教学" }));

    expect(screen.getByRole("radio", { name: "项目制教学" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await waitFor(() => {
      expect(listCourseProjects(window.localStorage)[0]?.courseBrief.teachingStyles).toEqual([
        "项目制",
      ]);
    });
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

    expect(await screen.findByRole("heading", { name: "AI 规划" })).toBeInTheDocument();
    expect(screen.getByLabelText("课时数量")).toHaveValue(51);
    expect(screen.getByLabelText("已保存的教学风格")).toHaveTextContent("互动式");
    await user.click(screen.getByRole("button", { name: "下一步" }));
    expect((await screen.findAllByText("课程蓝图最多支持 50 个课时")).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "AI 规划" })).toBeInTheDocument();
  });

  it("shows the fixed base plan and preserves existing resource choices", async () => {
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 4,
      values: {
        courseTitle: "旧项目资源方案",
        requestedResources: ["lesson_plan", "teacher_script"],
      },
      status: "draft",
    });

    render(<CourseWizard />);

    expect(await screen.findByRole("heading", { name: "资源方案" })).toBeInTheDocument();
    expect(screen.getByText("基础方案")).toBeInTheDocument();
    expect(screen.getByText("课程蓝图")).toBeInTheDocument();
    expect(screen.getByText("教学大纲与课程规划")).toBeInTheDocument();
    expect(
      screen.getByText(
        "以上内容属于课程蓝图的固有产物，不会创建独立的教学资源文件。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "教师教案" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "教师讲稿" })).toBeChecked();
    await waitFor(() => {
      expect(listCourseProjects(window.localStorage)[0]?.courseBrief.requestedResources).toEqual([
        "lesson_plan",
        "teacher_script",
      ]);
    });
  });

  it("adds the base course plan only when the resource step first opens empty", async () => {
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 4,
      values: {
        courseTitle: "首次资源方案",
        requestedResources: [],
      },
      status: "draft",
    });

    render(<CourseWizard />);

    expect(await screen.findByRole("heading", { name: "资源方案" })).toBeInTheDocument();
    await waitFor(() => {
      expect(listCourseProjects(window.localStorage)[0]?.courseBrief.requestedResources).toEqual([
        "course_plan",
      ]);
    });
  });

  it("maps advanced resource cards to the existing requestedResources values", async () => {
    const user = userEvent.setup();
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 4,
      values: {
        courseTitle: "高级资源映射",
        requestedResources: [],
      },
      status: "draft",
    });

    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "资源方案" });
    await user.click(screen.getByRole("checkbox", { name: "PPT课件" }));
    await user.click(screen.getByRole("checkbox", { name: "教师教案" }));
    await user.click(screen.getByRole("checkbox", { name: "学生练习与作业" }));

    await waitFor(() => {
      expect(listCourseProjects(window.localStorage)[0]?.courseBrief.requestedResources).toEqual([
        "course_plan",
        "slides",
        "lesson_plan",
        "worksheet",
      ]);
    });
  });

  it("shows a product summary and returns to the selected step without submitting", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 5,
      values: validCourseBrief,
      status: "submitted",
    });

    render(<CourseWizard />);

    expect(await screen.findByRole("heading", { name: "确认创建" })).toBeInTheDocument();
    expect(screen.getByText("Python 编程启蒙")).toBeInTheDocument();
    expect(screen.getByText("小学高年级学生 · 五年级 · 零基础")).toBeInTheDocument();
    expect(screen.getByText("理解循环并完成基础编程任务")).toBeInTheDocument();
    expect(screen.getByText("1 课时 × 45 分钟")).toBeInTheDocument();
    expect(screen.getByText("互动式")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI 生成内容" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建 AI 课程" })).toBeInTheDocument();
    expect(screen.queryByText(/schemaVersion/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "修改课程目标" }));

    expect(await screen.findByRole("heading", { name: "AI 规划" })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("completes the upgraded five-step course creation flow", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "课程想法" });
    await user.type(screen.getByLabelText("课程名称"), "Python 少儿编程");
    await user.type(screen.getByLabelText("学科或领域"), "编程");
    await user.type(screen.getByLabelText("课程主题"), "Python 基础");
    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(await screen.findByRole("heading", { name: "学员画像" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "小学生" }));
    await user.click(screen.getByRole("radio", { name: "小学" }));
    await user.click(screen.getByRole("radio", { name: "零基础" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(await screen.findByRole("heading", { name: "AI 规划" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "AI智能规划（推荐）" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByLabelText("希望学生学会什么？")).not.toHaveValue("");
    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(await screen.findByRole("heading", { name: "资源方案" })).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "PPT课件" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(await screen.findByRole("heading", { name: "确认创建" })).toBeInTheDocument();
    expect(screen.getByText("Python 少儿编程")).toBeInTheDocument();
    expect(screen.getByText("小学生 · 小学 · 零基础")).toBeInTheDocument();
    expect(screen.getByText("8 课时 × 45 分钟")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "创建 AI 课程" }));

    expect(await screen.findByRole("heading", { name: "AI 正在生成课程蓝图" })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(listCourseProjects(window.localStorage)).toHaveLength(1);
  });

  it("asks for confirmation before clearing the draft", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "课程想法" });
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

    await screen.findByRole("heading", { name: "学员画像" });
    await user.click(screen.getByRole("button", { name: "清除草稿" }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(await screen.findByRole("heading", { name: "课程想法" })).toBeInTheDocument();
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

    const button = await screen.findByRole("button", { name: "创建 AI 课程" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(await screen.findByRole("heading", { name: "AI 正在生成课程蓝图" })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    vi.unstubAllGlobals();
  });
});
