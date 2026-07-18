"use client";

import { useRef, useState } from "react";

import {
  ResourceGenerationApiError,
  generateLessonResource,
} from "@/features/course-resources/resource-generation-api";
import type {
  ResourceArtifact,
  ResourceType,
} from "@/features/course-resources/resource-artifact-schema";
import {
  createResourceArtifactVersion,
  listResourceArtifactVersions,
  ResourceArtifactStorageError,
} from "@/features/course-resources/resource-artifact-storage";
import type { CoursePlan } from "@/features/course-generation/course-plan-schema";
import type { CourseBrief } from "@/features/course-wizard/course-brief-schema";

export const LESSON_RESOURCE_TYPES = ["lesson_plan", "slide_outline"] as const;

export type ResourceGenerationState = "idle" | "generating" | "success" | "error";
export type ArtifactVersions = Record<ResourceType, ResourceArtifact[]>;

const initialStates: Record<ResourceType, ResourceGenerationState> = {
  lesson_plan: "idle",
  slide_outline: "idle",
};

function readArtifactVersions(projectId: string, lessonId: string): ArtifactVersions {
  if (typeof window === "undefined") return { lesson_plan: [], slide_outline: [] };
  return {
    lesson_plan: listResourceArtifactVersions(window.localStorage, {
      courseProjectId: projectId,
      lessonId,
      resourceType: "lesson_plan",
    }),
    slide_outline: listResourceArtifactVersions(window.localStorage, {
      courseProjectId: projectId,
      lessonId,
      resourceType: "slide_outline",
    }),
  };
}

export function useLessonResources({
  projectId,
  courseBrief,
  coursePlan,
  projectUpdatedAt,
  moduleId,
  lessonId,
}: {
  projectId: string;
  courseBrief: CourseBrief;
  coursePlan: CoursePlan;
  projectUpdatedAt: string;
  moduleId: string;
  lessonId: string;
}) {
  const [versions, setVersions] = useState<ArtifactVersions>(() =>
    readArtifactVersions(projectId, lessonId),
  );
  const [selectedResourceIds, setSelectedResourceIds] = useState<
    Partial<Record<ResourceType, string>>
  >({});
  const [states, setStates] = useState<Record<ResourceType, ResourceGenerationState>>(
    initialStates,
  );
  const [errors, setErrors] = useState<Partial<Record<ResourceType, string>>>({});
  const inFlightRef = useRef<Record<ResourceType, boolean>>({
    lesson_plan: false,
    slide_outline: false,
  });

  const readyArtifacts: Partial<Record<ResourceType, ResourceArtifact>> = {
    lesson_plan: versions.lesson_plan.find((artifact) => artifact.status === "ready"),
    slide_outline: versions.slide_outline.find((artifact) => artifact.status === "ready"),
  };

  const generate = async (resourceType: ResourceType) => {
    if (inFlightRef.current[resourceType]) return null;
    inFlightRef.current[resourceType] = true;
    setStates((current) => ({ ...current, [resourceType]: "generating" }));
    setErrors((current) => ({ ...current, [resourceType]: undefined }));

    try {
      const response = await generateLessonResource({
        courseProjectId: projectId,
        resourceType,
        lessonId,
        courseBrief,
        coursePlan,
      });
      if (
        response.courseProjectId !== projectId ||
        response.resource.resourceType !== resourceType ||
        response.resource.moduleId !== moduleId ||
        response.resource.lessonId !== lessonId
      ) {
        throw new ResourceGenerationApiError(
          "资源生成服务返回了不匹配的课时数据，请重试。",
          "RESOURCE_CONTEXT_MISMATCH",
        );
      }

      const artifactBase = {
        courseProjectId: projectId,
        moduleId,
        lessonId,
        title: response.resource.title,
        sourceProjectUpdatedAt: projectUpdatedAt,
        generation: {
          requestId: response.requestId,
          ...response.generation,
        },
      };
      const artifact = response.resource.resourceType === "lesson_plan"
        ? createResourceArtifactVersion(window.localStorage, {
            ...artifactBase,
            resourceType: "lesson_plan",
            content: response.resource.content,
          })
        : createResourceArtifactVersion(window.localStorage, {
            ...artifactBase,
            resourceType: "slide_outline",
            content: response.resource.content,
          });

      setVersions((current) => ({
        ...current,
        [resourceType]: listResourceArtifactVersions(window.localStorage, {
          courseProjectId: projectId,
          lessonId,
          resourceType,
        }),
      }));
      setSelectedResourceIds((current) => ({
        ...current,
        [resourceType]: artifact.resourceId,
      }));
      setStates((current) => ({ ...current, [resourceType]: "success" }));
      return artifact;
    } catch (error) {
      const message =
        error instanceof ResourceGenerationApiError || error instanceof ResourceArtifactStorageError
          ? error.message
          : "课程资源生成失败，请重试。";
      setErrors((current) => ({ ...current, [resourceType]: message }));
      setStates((current) => ({ ...current, [resourceType]: "error" }));
      return null;
    } finally {
      inFlightRef.current[resourceType] = false;
    }
  };

  const selectVersion = (resourceType: ResourceType, resourceId: string) => {
    setSelectedResourceIds((current) => ({
      ...current,
      [resourceType]: resourceId,
    }));
  };

  return {
    versions,
    readyArtifacts,
    selectedResourceIds,
    states,
    errors,
    generate,
    selectVersion,
  };
}
