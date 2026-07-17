import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  LessonPlanContent,
  ResourceType,
  SlideOutlineContent,
} from "@/features/course-resources/resource-artifact-schema";
import {
  createResourceArtifactVersion,
  getReadyResourceArtifact,
  listResourceArtifactVersions,
} from "@/features/course-resources/resource-artifact-storage";
import { CourseWorkspace } from "@/features/course-workspace/course-workspace";
import {
  attachGenerationToProject,
  createDraftCourseProject,
  finalizeCourseProject,
  saveCourseProject,
} from "@/features/course-workspace/course-project-storage";
import { makeCourseResponse, validCourseBrief } from "./course-generation-fixtures";

const generation = {
  provider: "provider-from-api",
  model: "model-from-api",
  promptVersion: "resource-generation-v1",
  attempts: 1,
  generatedAt: "2026-07-17T10:00:00.000Z",
  usage: {
    promptTokens: 100,
    promptCacheHitTokens: 0,
    promptCacheMissTokens: 100,
    completionTokens: 200,
    totalTokens: 300,
    estimatedCostUsd: null,
    pricingSnapshot: null,
  },
};

const lessonPlanContent: LessonPlanContent = {
  summary: "通过生活案例认识循环结构。",
  objectives: ["识别重复任务"],
  keyPoints: ["重复", "循环"],
  difficultPoints: [],
  preparation: ["循环任务卡片"],
  stages: [
    {
      stageId: "ST01",
      title: "课堂活动",
      durationMinutes: 45,
      teacherActivities: ["展示重复任务案例"],
      learnerActivities: ["观察并描述重复行为"],
      assessment: "检查学员能否识别重复步骤",
    },
  ],
  assessment: "完成课堂循环识别任务",
  differentiation: [],
  extension: "",
  assumptions: [],
  qualityChecklist: ["目标与活动一致"],
};

const slideOutlineContent: SlideOutlineContent = {
  overview: "使用六页幻灯片介绍循环概念。",
  slides: Array.from({ length: 6 }, (_, index) => ({
    slideId: `S${String(index + 1).padStart(2, "0")}`,
    title: `幻灯片 ${index + 1}`,
    purpose: "推进课堂讲解",
    keyPoints: ["循环概念"],
    visualSuggestion: "使用简单流程图",
    speakerNotes: "结合生活案例讲解",
  })),
  assumptions: [],
  qualityChecklist: ["每页目标清晰"],
};

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

function makeResourceResponse(
  projectId: string,
  resourceType: ResourceType,
  lessonId = "L001",
  moduleId = "M01",
) {
  return {
    schemaVersion: "1.0",
    requestId: `request-${resourceType}-${lessonId}`,
    status: "succeeded",
    courseProjectId: projectId,
    resource: {
      moduleId,
      lessonId,
      resourceType,
      title: resourceType === "lesson_plan" ? "认识重复任务教师教案" : "认识重复任务PPT结构",
      content: resourceType === "lesson_plan" ? lessonPlanContent : slideOutlineContent,
    },
    generation,
  };
}

function mockSuccessfulGeneration(projectId: string) {
  return vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
    const request = JSON.parse(init.body as string) as {
      resourceType: ResourceType;
      lessonId: string;
    };
    return new Response(
      JSON.stringify(makeResourceResponse(projectId, request.resourceType, request.lessonId)),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });
}

describe("Workspace resource generation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the two supported resource entries for each lesson", async () => {
    const project = createGeneratedProject();
    render(<CourseWorkspace projectId={project.id} />);

    const resources = await screen.findByRole("region", { name: "L001 资源" });
    expect(within(resources).getByText("教师教案 · 未生成")).toBeInTheDocument();
    expect(within(resources).getByText("PPT结构 · 未生成")).toBeInTheDocument();
    expect(within(resources).getByRole("button", { name: "生成教师教案" })).toBeInTheDocument();
    expect(within(resources).getByRole("button", { name: "生成PPT结构" })).toBeInTheDocument();
  });

  it("calls the resource API and saves a successful Artifact", async () => {
    const user = userEvent.setup();
    const project = createGeneratedProject();
    const fetchMock = mockSuccessfulGeneration(project.id);
    vi.stubGlobal("fetch", fetchMock);
    render(<CourseWorkspace projectId={project.id} />);

    const resources = await screen.findByRole("region", { name: "L001 资源" });
    await user.click(within(resources).getByRole("button", { name: "生成教师教案" }));

    expect(await within(resources).findByText("教师教案已保存为 v1")).toBeInTheDocument();
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request).toMatchObject({
      schemaVersion: "1.0",
      courseProjectId: project.id,
      lessonId: "L001",
      resourceType: "lesson_plan",
    });
    expect(getReadyResourceArtifact(window.localStorage, {
      courseProjectId: project.id,
      lessonId: "L001",
      resourceType: "lesson_plan",
    })).toMatchObject({ status: "ready", version: 1 });
  });

  it("shows a safe error without saving an Artifact when generation fails", async () => {
    const user = userEvent.setup();
    const project = createGeneratedProject();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "LLM_RATE_LIMITED",
              message: "AI 服务繁忙，请稍后重试。",
              retryable: true,
              requestId: "request-failed",
            },
          }),
          { status: 429 },
        ),
      ),
    );
    render(<CourseWorkspace projectId={project.id} />);

    const resources = await screen.findByRole("region", { name: "L001 资源" });
    await user.click(within(resources).getByRole("button", { name: "生成PPT结构" }));

    expect(await within(resources).findByRole("alert")).toHaveTextContent("AI 服务繁忙，请稍后重试。");
    expect(getReadyResourceArtifact(window.localStorage, {
      courseProjectId: project.id,
      lessonId: "L001",
      resourceType: "slide_outline",
    })).toBeNull();
  });

  it("blocks resource generation while course edits are unsaved", async () => {
    const user = userEvent.setup();
    const project = createGeneratedProject();
    const fetchMock = mockSuccessfulGeneration(project.id);
    vi.stubGlobal("fetch", fetchMock);
    render(<CourseWorkspace projectId={project.id} />);

    await screen.findByRole("region", { name: "L001 资源" });
    await user.click(screen.getByRole("button", { name: "编辑课程" }));
    await user.clear(screen.getByLabelText("课时标题"));
    await user.type(screen.getByLabelText("课时标题"), "尚未保存的新标题");

    const lessonPlanButton = screen.getByRole("button", { name: "生成教师教案" });
    const slideButton = screen.getByRole("button", { name: "生成PPT结构" });
    expect(lessonPlanButton).toBeDisabled();
    expect(slideButton).toBeDisabled();
    expect(screen.getByText("请先保存课程修改，再生成课时资源。")).toBeInTheDocument();
    await user.click(lessonPlanButton);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getReadyResourceArtifact(window.localStorage, {
      courseProjectId: project.id,
      lessonId: "L001",
      resourceType: "lesson_plan",
    })).toBeNull();
  });

  it("loads an existing ready resource and offers a new immutable version", async () => {
    const project = createGeneratedProject();
    createResourceArtifactVersion(window.localStorage, {
      courseProjectId: project.id,
      moduleId: "M01",
      lessonId: "L001",
      resourceType: "lesson_plan",
      title: "已有教师教案",
      sourceProjectUpdatedAt: project.updatedAt,
      generation: { requestId: "existing-request", ...generation },
      content: lessonPlanContent,
    });
    render(<CourseWorkspace projectId={project.id} />);

    const resources = await screen.findByRole("region", { name: "L001 资源" });
    expect(await within(resources).findByText("教师教案 · 已生成 · v1")).toBeInTheDocument();
    const fetchMock = mockSuccessfulGeneration(project.id);
    vi.stubGlobal("fetch", fetchMock);
    await userEvent.setup().click(
      within(resources).getByRole("button", { name: "重新生成教师教案" }),
    );

    expect(await within(resources).findByText("教师教案已保存为 v2")).toBeInTheDocument();
    expect(within(resources).getByText("教师教案 · 已生成 · v2")).toBeInTheDocument();
    expect(listResourceArtifactVersions(window.localStorage, {
      courseProjectId: project.id,
      lessonId: "L001",
      resourceType: "lesson_plan",
    }).map((artifact) => ({ version: artifact.version, status: artifact.status }))).toEqual([
      { version: 2, status: "ready" },
      { version: 1, status: "superseded" },
    ]);
  });

  it("keeps resources isolated between lessons", async () => {
    const project = createGeneratedProject();
    const secondLesson = {
      lessonId: "L002",
      moduleId: "M01",
      lessonNumber: 2,
      title: "编写第一个循环",
      objective: "使用循环完成重复任务",
      keyConcepts: ["循环"],
      durationMinutes: 45,
    };
    const twoLessonProject = saveCourseProject(window.localStorage, {
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
    createResourceArtifactVersion(window.localStorage, {
      courseProjectId: project.id,
      moduleId: "M01",
      lessonId: "L002",
      resourceType: "slide_outline",
      title: "第二课PPT结构",
      sourceProjectUpdatedAt: project.updatedAt,
      generation: { requestId: "lesson-two-request", ...generation },
      content: slideOutlineContent,
    });
    render(<CourseWorkspace projectId={twoLessonProject.id} />);

    const first = await screen.findByRole("region", { name: "L001 资源" });
    const second = await screen.findByRole("region", { name: "L002 资源" });
    expect(within(first).getByText("PPT结构 · 未生成")).toBeInTheDocument();
    expect(within(second).getByText("PPT结构 · 已生成 · v1")).toBeInTheDocument();
  });
});
