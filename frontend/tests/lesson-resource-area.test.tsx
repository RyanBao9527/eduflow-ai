import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ResourceType } from "@/features/course-resources/resource-artifact-schema";
import {
  createResourceArtifactVersion,
  getReadyResourceArtifact,
  listResourceArtifactVersions,
} from "@/features/course-resources/resource-artifact-storage";
import { LessonResourceArea } from "@/features/lesson-workspace/lesson-resource-area";
import {
  attachGenerationToProject,
  createDraftCourseProject,
  finalizeCourseProject,
  saveCourseProject,
} from "@/features/course-workspace/course-project-storage";
import { makeCourseResponse, validCourseBrief } from "./course-generation-fixtures";
import {
  makeLessonPlanContent,
  makeSlideOutlineContent,
  resourceGenerationMetadata,
} from "./resource-artifact-fixtures";

const apiGeneration = {
  provider: resourceGenerationMetadata.provider,
  model: resourceGenerationMetadata.model,
  promptVersion: resourceGenerationMetadata.promptVersion,
  attempts: resourceGenerationMetadata.attempts,
  generatedAt: resourceGenerationMetadata.generatedAt,
  usage: resourceGenerationMetadata.usage,
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

function renderResourceArea(
  project = createGeneratedProject(),
  lessonId = "L001",
  moduleId = "M01",
) {
  render(
    <LessonResourceArea
      projectId={project.id}
      courseBrief={validCourseBrief}
      coursePlan={project.coursePlan!}
      projectUpdatedAt={project.updatedAt}
      moduleId={moduleId}
      lessonId={lessonId}
    />,
  );
  return project;
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
      content:
        resourceType === "lesson_plan" ? makeLessonPlanContent() : makeSlideOutlineContent(),
    },
    generation: apiGeneration,
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

describe("LessonResourceArea", () => {
  it("shows generation actions when neither resource exists", () => {
    renderResourceArea();

    expect(screen.getAllByText("未生成")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "生成教案" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成PPT结构" })).toBeInTheDocument();
  });

  it("shows existing resource versions and opens only the selected result", async () => {
    const user = userEvent.setup();
    const project = createGeneratedProject();
    createResourceArtifactVersion(window.localStorage, {
      courseProjectId: project.id,
      moduleId: "M01",
      lessonId: "L001",
      resourceType: "lesson_plan",
      title: "已有教师教案",
      sourceProjectUpdatedAt: project.updatedAt,
      generation: resourceGenerationMetadata,
      content: makeLessonPlanContent(),
    });
    createResourceArtifactVersion(window.localStorage, {
      courseProjectId: project.id,
      moduleId: "M01",
      lessonId: "L001",
      resourceType: "slide_outline",
      title: "已有PPT结构",
      sourceProjectUpdatedAt: project.updatedAt,
      generation: resourceGenerationMetadata,
      content: makeSlideOutlineContent(),
    });
    renderResourceArea(project);

    expect(screen.getAllByText("已生成 v1")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "查看教案" }));
    expect(screen.getByRole("region", { name: "教师教案结果" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "PPT课件结构结果" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "查看PPT结构" }));
    expect(screen.getByRole("region", { name: "PPT课件结构结果" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "教师教案结果" })).not.toBeInTheDocument();
  });

  it("defaults to the latest ready version and can inspect history", async () => {
    const user = userEvent.setup();
    const project = createGeneratedProject();
    for (const title of ["教师教案 v1", "教师教案 v2"]) {
      createResourceArtifactVersion(window.localStorage, {
        courseProjectId: project.id,
        moduleId: "M01",
        lessonId: "L001",
        resourceType: "lesson_plan",
        title,
        sourceProjectUpdatedAt: project.updatedAt,
        generation: resourceGenerationMetadata,
        content: makeLessonPlanContent(title),
      });
    }
    renderResourceArea(project);

    await user.click(screen.getByRole("button", { name: "查看教案" }));
    const result = screen.getByRole("region", { name: "教师教案结果" });
    expect(within(result).getByRole("heading", { name: "教师教案 v2" })).toBeInTheDocument();
    await user.click(within(result).getByRole("button", { name: "查看教师教案 v1" }));
    expect(within(result).getByRole("heading", { name: "教师教案 v1" })).toBeInTheDocument();
    expect(within(result).getByText("历史版本 · v1")).toBeInTheDocument();
  });

  it.each([
    ["lesson_plan", "生成教案"],
    ["slide_outline", "生成PPT结构"],
  ] as const)("generates and stores the correct %s Artifact", async (resourceType, buttonName) => {
    const user = userEvent.setup();
    const project = createGeneratedProject();
    const fetchMock = mockSuccessfulGeneration(project.id);
    vi.stubGlobal("fetch", fetchMock);
    renderResourceArea(project);

    await user.click(screen.getByRole("button", { name: buttonName }));

    expect(await screen.findByRole("region", {
      name: resourceType === "lesson_plan" ? "教师教案结果" : "PPT课件结构结果",
    })).toBeInTheDocument();
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request).toMatchObject({
      courseProjectId: project.id,
      lessonId: "L001",
      resourceType,
    });
    expect(getReadyResourceArtifact(window.localStorage, {
      courseProjectId: project.id,
      lessonId: "L001",
      resourceType,
    })).toMatchObject({ status: "ready", version: 1 });
    const otherType = resourceType === "lesson_plan" ? "slide_outline" : "lesson_plan";
    expect(getReadyResourceArtifact(window.localStorage, {
      courseProjectId: project.id,
      lessonId: "L001",
      resourceType: otherType,
    })).toBeNull();
  });

  it("does not create an Artifact or remove an existing version when generation fails", async () => {
    const user = userEvent.setup();
    const project = createGeneratedProject();
    const existing = createResourceArtifactVersion(window.localStorage, {
      courseProjectId: project.id,
      moduleId: "M01",
      lessonId: "L001",
      resourceType: "lesson_plan",
      title: "保留的教师教案",
      sourceProjectUpdatedAt: project.updatedAt,
      generation: resourceGenerationMetadata,
      content: makeLessonPlanContent(),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "LLM_RATE_LIMITED",
              message: "AI 服务繁忙，请稍后重试。",
              retryable: true,
              requestId: "failed-request",
            },
          }),
          { status: 429 },
        ),
      ),
    );
    renderResourceArea(project);

    await user.click(screen.getByRole("button", { name: "重新生成教师教案" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("AI 服务繁忙，请稍后重试。");
    expect(listResourceArtifactVersions(window.localStorage, {
      courseProjectId: project.id,
      lessonId: "L001",
      resourceType: "lesson_plan",
    })).toHaveLength(1);
    expect(getReadyResourceArtifact(window.localStorage, {
      courseProjectId: project.id,
      lessonId: "L001",
      resourceType: "lesson_plan",
    })?.resourceId).toBe(existing.resourceId);
  });

  it("rejects a response for another lesson without creating an Artifact", async () => {
    const user = userEvent.setup();
    const project = createGeneratedProject();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(makeResourceResponse(project.id, "lesson_plan", "L002")), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    renderResourceArea(project);

    await user.click(screen.getByRole("button", { name: "生成教案" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("不匹配的课时数据");
    expect(listResourceArtifactVersions(window.localStorage, {
      courseProjectId: project.id,
      lessonId: "L001",
      resourceType: "lesson_plan",
    })).toHaveLength(0);
  });

  it("keeps Artifacts isolated between lessons", () => {
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
      generation: resourceGenerationMetadata,
      content: makeSlideOutlineContent(),
    });

    renderResourceArea(twoLessonProject, "L001");

    expect(screen.getAllByText("未生成")).toHaveLength(2);
  });

  it("allows only one in-flight request per resource type", async () => {
    const project = createGeneratedProject();
    let resolveRequest!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    }));
    vi.stubGlobal("fetch", fetchMock);
    renderResourceArea(project);

    const button = screen.getByRole("button", { name: "生成教案" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveRequest(new Response(JSON.stringify(makeResourceResponse(project.id, "lesson_plan")), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    await waitFor(() => expect(screen.getByText("教师教案已保存为 v1")).toBeInTheDocument());
  });
});
