from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, model_validator

from backend.models.course_generation import (
    ApiModel,
    CourseBrief,
    CoursePlan,
    TokenUsage,
)

ResourceType = Literal["lesson_plan", "slide_outline"]


class ResourceGenerateRequest(ApiModel):
    schema_version: Literal["1.0"] = "1.0"
    course_project_id: UUID
    resource_type: ResourceType
    lesson_id: str = Field(pattern=r"^L[0-9]{3}$")
    course_brief: CourseBrief
    course_plan: CoursePlan

    @model_validator(mode="after")
    def validate_lesson_context(self) -> "ResourceGenerateRequest":
        lesson = next(
            (
                item
                for item in self.course_plan.lesson_index
                if item.lesson_id == self.lesson_id
            ),
            None,
        )
        if lesson is None:
            raise ValueError("lessonId must exist in coursePlan.lessonIndex")

        module = next(
            (
                item
                for item in self.course_plan.modules
                if item.module_id == lesson.module_id
            ),
            None,
        )
        if module is None or self.lesson_id not in module.lesson_ids:
            raise ValueError("lessonId and moduleId relationship is inconsistent")
        return self


class LessonPlanStage(ApiModel):
    stage_id: str = Field(pattern=r"^ST[0-9]{2}$")
    title: str = Field(min_length=1, max_length=100)
    duration_minutes: int = Field(ge=1, le=480)
    teacher_activities: list[str] = Field(min_length=1, max_length=6)
    learner_activities: list[str] = Field(min_length=1, max_length=6)
    assessment: str = Field(min_length=1, max_length=300)


class LessonPlanContent(ApiModel):
    summary: str = Field(min_length=2, max_length=600)
    objectives: list[str] = Field(min_length=1, max_length=6)
    key_points: list[str] = Field(min_length=1, max_length=6)
    difficult_points: list[str] = Field(default_factory=list, max_length=6)
    preparation: list[str] = Field(default_factory=list, max_length=10)
    stages: list[LessonPlanStage] = Field(min_length=1, max_length=10)
    assessment: str = Field(min_length=2, max_length=600)
    differentiation: list[str] = Field(default_factory=list, max_length=6)
    extension: str = Field(default="", max_length=500)
    assumptions: list[str] = Field(default_factory=list, max_length=5)
    quality_checklist: list[str] = Field(min_length=1, max_length=8)


class SlideOutlineItem(ApiModel):
    slide_id: str = Field(pattern=r"^S[0-9]{2}$")
    title: str = Field(min_length=1, max_length=100)
    purpose: str = Field(min_length=1, max_length=240)
    key_points: list[str] = Field(min_length=1, max_length=5)
    visual_suggestion: str = Field(min_length=1, max_length=300)
    speaker_notes: str = Field(min_length=1, max_length=500)


class SlideOutlineContent(ApiModel):
    overview: str = Field(min_length=2, max_length=600)
    slides: list[SlideOutlineItem] = Field(min_length=6, max_length=15)
    assumptions: list[str] = Field(default_factory=list, max_length=5)
    quality_checklist: list[str] = Field(min_length=1, max_length=8)


class GeneratedResourceBase(ApiModel):
    module_id: str = Field(pattern=r"^M[0-9]{2}$")
    lesson_id: str = Field(pattern=r"^L[0-9]{3}$")
    title: str = Field(min_length=2, max_length=160)


class GeneratedLessonPlanResource(GeneratedResourceBase):
    resource_type: Literal["lesson_plan"]
    content: LessonPlanContent


class GeneratedSlideOutlineResource(GeneratedResourceBase):
    resource_type: Literal["slide_outline"]
    content: SlideOutlineContent


GeneratedResource = Annotated[
    GeneratedLessonPlanResource | GeneratedSlideOutlineResource,
    Field(discriminator="resource_type"),
]


class ResourceGenerationMetadata(ApiModel):
    provider: str = Field(min_length=1)
    model: str = Field(min_length=1)
    prompt_version: str = Field(min_length=1)
    attempts: int = Field(ge=1, le=2)
    generated_at: datetime
    usage: TokenUsage


class ResourceGenerateResponse(ApiModel):
    schema_version: Literal["1.0"] = "1.0"
    request_id: str = Field(min_length=1)
    status: Literal["succeeded"] = "succeeded"
    course_project_id: UUID
    resource: GeneratedResource
    generation: ResourceGenerationMetadata
