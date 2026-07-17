import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { CoursePlanResult } from "@/features/course-generation/course-plan-result";
import {
  clearCourseGeneration,
  saveCourseGeneration,
} from "@/features/course-generation/course-generation-storage";
import { makeCourseResponse, validCourseBrief } from "./course-generation-fixtures";

describe("CoursePlanResult", () => {
  beforeEach(() => clearCourseGeneration(window.sessionStorage));

  it("renders provider and model from the saved API response", async () => {
    saveCourseGeneration(
      window.sessionStorage,
      validCourseBrief,
      makeCourseResponse("another-provider", "another-model"),
    );

    render(<CoursePlanResult />);

    expect(await screen.findByRole("heading", { name: "Python 编程启蒙" })).toBeInTheDocument();
    expect(screen.getByText("another-provider · another-model")).toBeInTheDocument();
    expect(screen.getByText("课时结构")).toBeInTheDocument();
  });
});
