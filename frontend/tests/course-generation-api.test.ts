import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CourseGenerationApiError,
  generateCoursePlan,
} from "@/features/course-generation/course-generation-api";
import { makeCourseResponse, validCourseBrief } from "./course-generation-fixtures";

describe("course generation API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends only the course brief and uses response model metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(makeCourseResponse("runtime-provider", "runtime-model")), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await generateCoursePlan(validCourseBrief);
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);

    expect(request).toEqual({ schemaVersion: "1.0", courseBrief: validCourseBrief });
    expect(request).not.toHaveProperty("provider");
    expect(request).not.toHaveProperty("model");
    expect(request).not.toHaveProperty("detailMode");
    expect(response.generation.provider).toBe("runtime-provider");
    expect(response.generation.model).toBe("runtime-model");
  });

  it("normalizes API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: "LLM_RATE_LIMITED", message: "稍后重试", retryable: true, requestId: "r-1" } }),
          { status: 429 },
        ),
      ),
    );

    await expect(generateCoursePlan(validCourseBrief)).rejects.toMatchObject<CourseGenerationApiError>({
      code: "LLM_RATE_LIMITED",
      retryable: true,
      requestId: "r-1",
    });
  });
});
