import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { CoursePlanResult } from "@/features/course-generation/course-plan-result";
import {
  clearCourseGeneration,
  saveCourseGeneration,
} from "@/features/course-generation/course-generation-storage";
import {
  attachGenerationToProject,
  createDraftCourseProject,
  getCourseProject,
} from "@/features/course-workspace/course-project-storage";
import { makeCourseResponse, validCourseBrief } from "./course-generation-fixtures";

describe("CoursePlanResult", () => {
  beforeEach(() => clearCourseGeneration(window.sessionStorage));

  it("renders provider and model from the saved API response", async () => {
    const project = createDraftCourseProject(
      window.localStorage,
      validCourseBrief,
    );
    attachGenerationToProject(
      window.localStorage,
      project.id,
      validCourseBrief,
      makeCourseResponse("another-provider", "another-model"),
    );
    window.history.replaceState(null, "", `/courses/result?projectId=${project.id}`);

    render(<CoursePlanResult />);

    expect(await screen.findByRole("heading", { name: "Python 编程启蒙" })).toBeInTheDocument();
    expect(screen.getByText("another-provider · another-model")).toBeInTheDocument();
    expect(screen.getByText("课时结构")).toBeInTheDocument();
    expect(screen.getByText("后续课程资源规划")).toBeInTheDocument();
    expect(
      screen.getByText("以下内容仅为资源用途与适用范围规划，具体资源将在后续资源中心单独生成。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "用途：支持教师实施课程"),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "关联模块：M01 · 循环入门"),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "适用课时：L001"),
    ).toBeInTheDocument();
    expect(screen.queryByText("已生成PPT")).not.toBeInTheDocument();
    expect(screen.queryByText("下载教案")).not.toBeInTheDocument();
  });

  it("recovers a session-only blueprint and persists it when storage is available", async () => {
    const user = userEvent.setup();
    const project = createDraftCourseProject(window.localStorage, validCourseBrief);
    saveCourseGeneration(window.sessionStorage, validCourseBrief, makeCourseResponse());
    window.history.replaceState(null, "", `/courses/result?projectId=${project.id}`);

    render(<CoursePlanResult />);

    expect(await screen.findByText("课程蓝图暂未保存到长期存储")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "保存为课程项目" }));

    expect(getCourseProject(window.localStorage, project.id)?.status).toBe("generated");
    expect(window.sessionStorage).toHaveLength(0);
  });
});
