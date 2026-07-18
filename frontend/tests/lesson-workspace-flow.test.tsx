import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
  LessonPlanContent,
  ResourceType,
} from "@/features/course-resources/resource-artifact-schema";
import {
  createResourceArtifactVersion,
  listResourceArtifactVersions,
} from "@/features/course-resources/resource-artifact-storage";
import { CourseWorkspace } from "@/features/course-workspace/course-workspace";
import {
  attachGenerationToProject,
  createDraftCourseProject,
  finalizeCourseProject,
} from "@/features/course-workspace/course-project-storage";
import { LessonWorkspace } from "@/features/lesson-workspace/lesson-workspace";
import { makeCourseResponse, validCourseBrief } from "./course-generation-fixtures";
import {
  makeLessonPlanContent,
  makeSlideOutlineContent,
  resourceGenerationMetadata,
} from "./resource-artifact-fixtures";

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

function lessonPlanResponse(projectId: string, content: LessonPlanContent) {
  const generation = {
    provider: resourceGenerationMetadata.provider,
    model: resourceGenerationMetadata.model,
    promptVersion: resourceGenerationMetadata.promptVersion,
    attempts: resourceGenerationMetadata.attempts,
    generatedAt: resourceGenerationMetadata.generatedAt,
    usage: resourceGenerationMetadata.usage,
  };
  return {
    schemaVersion: "1.0",
    requestId: `resource-request-${content.summary}`,
    status: "succeeded",
    courseProjectId: projectId,
    resource: {
      moduleId: "M01",
      lessonId: "L001",
      resourceType: "lesson_plan" as const,
      title: "认识重复任务教师教案",
      content,
    },
    generation,
  };
}

describe("Lesson Workspace complete flow", () => {
  it("moves from course navigation to lesson preparation and preserves resource versions", async () => {
    const user = userEvent.setup();
    const project = createGeneratedProject();
    createResourceArtifactVersion(window.localStorage, {
      courseProjectId: project.id,
      moduleId: "M01",
      lessonId: "L001",
      resourceType: "slide_outline",
      title: "认识重复任务PPT结构",
      sourceProjectUpdatedAt: project.updatedAt,
      generation: resourceGenerationMetadata,
      content: makeSlideOutlineContent("单课PPT结构正文"),
    });

    const responses = [makeLessonPlanContent("第一版教案"), makeLessonPlanContent("第二版教案")];
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(init.body as string) as {
        courseProjectId: string;
        lessonId: string;
        resourceType: ResourceType;
      };
      const content = responses.shift()!;
      return new Response(JSON.stringify(lessonPlanResponse(request.courseProjectId, content)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const courseView = render(<CourseWorkspace projectId={project.id} />);
    const lessonSummary = await screen.findByRole("region", { name: "L001 课时摘要" });
    const preparationLink = within(lessonSummary).getByRole("link", { name: "进入备课" });
    expect(preparationLink).toHaveAttribute(
      "href",
      `/courses/${project.id}/lessons/L001`,
    );
    expect(within(lessonSummary).getByText("教师教案 · 未生成")).toBeInTheDocument();
    expect(within(lessonSummary).getByText("PPT结构 · 已生成")).toBeInTheDocument();
    expect(screen.queryByText("单课PPT结构正文")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    courseView.unmount();
    render(<LessonWorkspace projectId={project.id} lessonId="L001" />);

    expect(
      await screen.findByRole("heading", { name: "认识重复任务", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("循环入门 · M01")).toBeInTheDocument();
    expect(screen.getByText("45 分钟 · L001")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成教案" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看PPT结构" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "生成教案" }));
    expect(await screen.findByText("教师教案已保存为 v1")).toBeInTheDocument();
    expect(screen.getByText("第一版教案")).toBeInTheDocument();
    const firstRequest = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(firstRequest).toMatchObject({
      courseProjectId: project.id,
      lessonId: "L001",
      resourceType: "lesson_plan",
    });

    await user.click(screen.getByRole("button", { name: "重新生成教师教案" }));
    expect(await screen.findByText("教师教案已保存为 v2")).toBeInTheDocument();
    expect(screen.getByText("第二版教案")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      listResourceArtifactVersions(window.localStorage, {
        courseProjectId: project.id,
        lessonId: "L001",
        resourceType: "lesson_plan",
      }).map((artifact) => ({ version: artifact.version, status: artifact.status })),
    ).toEqual([
      { version: 2, status: "ready" },
      { version: 1, status: "superseded" },
    ]);
  });
});
