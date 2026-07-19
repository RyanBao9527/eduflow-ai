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

    await screen.findByRole("heading", { name: "创建课程基础信息" });
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

    await screen.findByRole("heading", { name: "创建课程基础信息" });
    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(await screen.findByText("请检查当前步骤")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "创建课程基础信息" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "学员画像" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("教学场景")).toBeInTheDocument();
  });

  it("offers local title suggestions without calling the network", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "创建课程基础信息" });
    await user.type(screen.getByLabelText("课程主题"), "Python");
    await user.click(screen.getByRole("button", { name: "生成课程名称建议" }));

    expect(screen.getByText("课程名称建议")).toBeInTheDocument();
    expect(screen.getByText("基于课程主题的本地规则推荐，不调用 AI 或网络。选择后仍可继续修改。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Python 少儿编程入门" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Python 数据分析入门" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Python 自动化办公" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Python 少儿编程入门/ }));

    expect(screen.getByLabelText("课程名称")).toHaveValue("Python 少儿编程入门");
    expect(screen.getByLabelText("课程主题")).toHaveValue("Python");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("uses grouped topic tags and explains when a course title is required", async () => {
    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "创建课程基础信息" });
    expect(screen.getByText("热门方向")).toBeInTheDocument();
    expect(screen.getByText("学科与技能")).toBeInTheDocument();
    expect(screen.getByLabelText("主题分组：企业培训")).toBeInTheDocument();
    expect(
      screen.getByText("展示给学生或客户的课程标题，可稍后填写；创建 AI 课程前需填写。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("下一步将选择学习者画像，系统会据此组织课程难度和课时规划。"),
    ).toBeInTheDocument();
  });

  it("keeps the description optional and generates its local default only after user action", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "创建课程基础信息" });
    const descriptionDetails = screen.getByText("课程简介（可选）").closest("details");
    expect(descriptionDetails).not.toHaveAttribute("open");

    await user.type(screen.getByLabelText("课程主题"), "Python编程");
    await user.click(screen.getByText("课程简介（可选）"));
    await user.click(screen.getByRole("button", { name: "生成默认简介" }));

    expect(screen.getByLabelText("课程简介")).toHaveValue(
      "围绕Python编程设计的实践型课程，帮助学员循序渐进地掌握核心知识并完成基础应用。",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("opens the optional description for a restored draft without changing its content", async () => {
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 1,
      values: {
        courseTitle: "旧课程简介",
        topic: "Python编程",
        description: "这是从旧草稿恢复的课程简介。",
      },
      status: "draft",
    });

    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "创建课程基础信息" });
    const descriptionDetails = screen.getByText("课程简介（可选）").closest("details");
    expect(descriptionDetails).toHaveAttribute("open");
    expect(screen.getByLabelText("课程简介")).toHaveValue("这是从旧草稿恢复的课程简介。");
  });

  it("uses topic tags and only fills an empty subject from local rules", async () => {
    const user = userEvent.setup();
    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "创建课程基础信息" });
    await user.click(screen.getByRole("button", { name: "Python编程" }));
    await user.click(screen.getByText("更多课程设置"));

    expect(screen.getByLabelText("课程主题")).toHaveValue("Python编程");
    expect(screen.getByLabelText("课程领域")).toHaveValue("编程教育");

    await user.clear(screen.getByLabelText("课程领域"));
    await user.type(screen.getByLabelText("课程主题"), "数据分析");

    expect(screen.getByLabelText("课程领域")).toHaveValue("");
  });

  it("allows an empty title to save a draft and continue the wizard", async () => {
    const user = userEvent.setup();
    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "创建课程基础信息" });
    await user.type(screen.getByLabelText("课程主题"), "Python编程");
    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(await screen.findByRole("heading", { name: "学员画像" })).toBeInTheDocument();
    await waitFor(() => {
      expect(listCourseProjects(window.localStorage)[0]?.courseBrief).toMatchObject({
        courseTitle: "",
        topic: "Python编程",
        subject: "编程教育",
      });
    });
  });

  it("preserves an old title-only draft and asks for its missing topic", async () => {
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 1,
      values: { courseTitle: "旧版课程名称" },
      status: "draft",
    });

    render(<CourseWizard />);

    expect(await screen.findByText("请补充课程主题。")).toBeInTheDocument();
    expect(screen.getByLabelText("课程名称")).toHaveValue("旧版课程名称");
    expect(screen.getByLabelText("课程主题")).toHaveValue("");
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
    expect(screen.getByRole("radiogroup", { name: "主要学习者" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "年龄/学习阶段" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "学习基础" })).toBeInTheDocument();
    expect(screen.getByLabelText("主要学习者其他，请说明内容")).toHaveValue("10–12 岁零基础学生");
    expect(screen.getByLabelText("年龄/学习阶段其他，请说明内容")).toHaveValue("小学高年级");
    expect(screen.getByLabelText("学习基础其他，请说明内容")).toHaveValue("有基础编程体验");
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
    await user.click(screen.getByRole("radio", { name: "K12学生" }));
    await user.click(screen.getByRole("radio", { name: "小学" }));
    await user.click(screen.getByRole("radio", { name: "零基础" }));

    expect(screen.getByRole("radio", { name: "K12学生" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "小学" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "零基础" })).toHaveAttribute("aria-checked", "true");
    await waitFor(() => {
      expect(listCourseProjects(window.localStorage)[0]?.courseBrief).toMatchObject({
        targetLearners: "K12学生",
        ageOrGrade: "小学",
        learnerLevel: "零基础",
      });
    });
  });

  it("uses clear learner profile wording and preserves the existing field values", async () => {
    const user = userEvent.setup();
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 2,
      values: { courseTitle: "学员画像文案" },
      status: "draft",
    });

    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "学员画像" });
    expect(screen.getByText("谁会参加这门课程？")).toBeInTheDocument();
    expect(screen.getByText("他们通常处于哪个学习阶段？")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "大学" })).toBeInTheDocument();

    const customOptionButtons = screen.getAllByRole("radio", { name: "其他，请说明" });
    await user.click(customOptionButtons[0]);
    await user.type(screen.getByLabelText("主要学习者其他，请说明内容"), "家长");
    await user.click(customOptionButtons[1]);
    await user.type(screen.getByLabelText("年龄/学习阶段其他，请说明内容"), "8-10岁");
    await user.click(customOptionButtons[2]);
    await user.type(screen.getByLabelText("学习基础其他，请说明内容"), "有项目实践经验");

    await waitFor(() => {
      expect(listCourseProjects(window.localStorage)[0]?.courseBrief).toMatchObject({
        targetLearners: "家长",
        ageOrGrade: "8-10岁",
        learnerLevel: "有项目实践经验",
      });
    });
  });

  it("defaults an empty education stage to adult only for adult learner types", async () => {
    const user = userEvent.setup();
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 2,
      values: { courseTitle: "成人学习课程" },
      status: "draft",
    });

    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "学员画像" });
    await user.click(screen.getByRole("radio", { name: "教师" }));

    expect(screen.getByRole("radio", { name: "成人（默认）" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.queryByRole("radio", { name: "小学" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(listCourseProjects(window.localStorage)[0]?.courseBrief).toMatchObject({
        targetLearners: "教师",
        ageOrGrade: "成人",
      });
    });
  });

  it("preserves a saved or user-selected education stage when the learner type becomes adult", async () => {
    const user = userEvent.setup();
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 2,
      values: {
        courseTitle: "学习阶段兼容测试",
        targetLearners: "大学生",
        ageOrGrade: "大学",
      },
      status: "draft",
    });

    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "学员画像" });
    await user.click(screen.getByRole("radio", { name: "企业员工" }));

    expect(screen.getByLabelText("年龄/学习阶段其他，请说明内容")).toHaveValue("大学");
    await waitFor(() => {
      expect(listCourseProjects(window.localStorage)[0]?.courseBrief).toMatchObject({
        targetLearners: "企业员工",
        ageOrGrade: "大学",
      });
    });
  });

  it("does not restore the adult default after a user clears the education stage", async () => {
    const user = userEvent.setup();
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 2,
      values: {
        courseTitle: "手动清空学习阶段",
        targetLearners: "K12学生",
        ageOrGrade: "小学",
      },
      status: "draft",
    });

    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "学员画像" });
    await user.click(screen.getAllByRole("radio", { name: "其他，请说明" })[1]);
    await user.click(screen.getByRole("radio", { name: "职场人士" }));

    expect(screen.getByLabelText("年龄/学习阶段其他，请说明内容")).toHaveValue("");
    expect(screen.getByRole("radio", { name: "成人（默认）" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
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

  it("returns to Step 1 without calling the API when the final title is missing", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    saveCourseWizardDraft(window.localStorage, {
      currentStep: 5,
      values: { ...validCourseBrief, courseTitle: "" },
      status: "draft",
    });

    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "确认创建" });
    await user.click(screen.getByRole("button", { name: "创建 AI 课程" }));

    expect(await screen.findByRole("heading", { name: "创建课程基础信息" })).toBeInTheDocument();
    expect(screen.getAllByText("请选择或输入课程名称")).not.toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("completes the upgraded five-step course creation flow", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    render(<CourseWizard />);

    await screen.findByRole("heading", { name: "创建课程基础信息" });
    await user.type(screen.getByLabelText("课程名称"), "Python 少儿编程");
    await user.type(screen.getByLabelText("课程主题"), "Python 基础");
    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(await screen.findByRole("heading", { name: "学员画像" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "K12学生" }));
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
    expect(screen.getByText("K12学生 · 小学 · 零基础")).toBeInTheDocument();
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

    await screen.findByRole("heading", { name: "创建课程基础信息" });
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
    expect(await screen.findByRole("heading", { name: "创建课程基础信息" })).toBeInTheDocument();
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
