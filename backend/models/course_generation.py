from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
        extra="forbid",
    )


TeachingScenario = Literal["offline", "live", "recorded", "corporate", "self_study"]
Difficulty = Literal["beginner", "intermediate", "advanced"]
ResourceType = Literal[
    "lesson_plan",
    "teacher_script",
    "student_handout",
    "slides",
    "worksheet",
    "assessment",
    "course_plan",
]
DetailMode = Literal["detailed", "balanced"]


class CourseBrief(ApiModel):
    course_title: str = Field(min_length=2, max_length=80)
    subject: str = Field(min_length=1, max_length=50)
    topic: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    teaching_scenario: TeachingScenario
    target_learners: str = Field(min_length=2, max_length=200)
    age_or_grade: str = Field(min_length=1, max_length=50)
    learner_level: str = Field(min_length=1, max_length=50)
    class_size: int | None = Field(default=None, ge=1, le=1000)
    lesson_duration_minutes: int = Field(ge=10, le=480)
    lesson_count: int = Field(ge=1, le=50)
    difficulty: Difficulty
    teaching_styles: list[str] = Field(min_length=1, max_length=5)
    overall_goal: str = Field(min_length=5, max_length=1000)
    requested_resources: list[ResourceType] = Field(
        min_length=1,
        max_length=7,
        description=(
            "Future teaching resource planning needs. These values do not request "
            "resource content in the current generation."
        ),
    )
    extra_requirements: str | None = Field(default=None, max_length=1000)


class CoursePlanGenerateRequest(ApiModel):
    schema_version: Literal["1.0"] = "1.0"
    course_brief: CourseBrief


class AudienceAnalysis(ApiModel):
    profile: str = Field(min_length=2, max_length=300)
    prerequisites: list[str] = Field(default_factory=list, max_length=6)
    learning_needs: list[str] = Field(min_length=1, max_length=6)


class LearningObjective(ApiModel):
    objective_id: str = Field(pattern=r"^OBJ[0-9]{2}$")
    statement: str = Field(min_length=2, max_length=200)
    evidence: str = Field(min_length=2, max_length=200)


class CourseModule(ApiModel):
    module_id: str = Field(pattern=r"^M[0-9]{2}$")
    title: str = Field(min_length=2, max_length=100)
    goal: str = Field(min_length=2, max_length=300)
    lesson_ids: list[str] = Field(min_length=1, max_length=50)
    key_concepts: list[str] = Field(min_length=1, max_length=8)


class CoursePhase(ApiModel):
    phase_id: str = Field(pattern=r"^P[0-9]{2}$")
    title: str = Field(min_length=2, max_length=100)
    goal: str = Field(min_length=2, max_length=300)
    module_ids: list[str] = Field(min_length=1, max_length=10)
    lesson_ids: list[str] = Field(min_length=1, max_length=50)
    milestone: str = Field(min_length=2, max_length=240)


class LessonIndexItem(ApiModel):
    lesson_id: str = Field(pattern=r"^L[0-9]{3}$")
    module_id: str = Field(pattern=r"^M[0-9]{2}$")
    lesson_number: int = Field(ge=1, le=50)
    title: str = Field(min_length=2, max_length=100)
    objective: str = Field(min_length=2, max_length=180)
    key_concepts: list[str] = Field(min_length=1, max_length=3)
    duration_minutes: int = Field(ge=10, le=480)


class LessonDetail(ApiModel):
    lesson_id: str = Field(pattern=r"^L[0-9]{3}$")
    teaching_activities: list[str] = Field(min_length=1, max_length=4)
    assessment_method: str = Field(min_length=2, max_length=200)


class TeachingStrategy(ApiModel):
    approach: str = Field(min_length=2, max_length=500)
    learner_engagement: str = Field(min_length=2, max_length=500)
    differentiation: list[str] = Field(min_length=1, max_length=6)


class AssessmentPlan(ApiModel):
    diagnostic: str = Field(min_length=2, max_length=400)
    formative: str = Field(min_length=2, max_length=400)
    summative: str = Field(min_length=2, max_length=400)


class ResourcePlanItem(ApiModel):
    resource_type: ResourceType
    purpose: str = Field(
        min_length=2,
        max_length=300,
        description="Planned use of the future resource, without resource body content.",
    )
    module_ids: list[str] = Field(
        default_factory=list,
        max_length=10,
        description="Course modules where the future resource is expected to be used.",
    )
    lesson_ids: list[str] = Field(
        default_factory=list,
        max_length=50,
        description="Specific lessons where the future resource is expected to be used.",
    )


class CoursePlanBase(ApiModel):
    schema_version: Literal["1.0"] = "1.0"
    title: str = Field(min_length=2, max_length=80)
    positioning: str = Field(min_length=2, max_length=300)
    overview: str = Field(min_length=2, max_length=800)
    assumptions: list[str] = Field(default_factory=list, max_length=5)
    audience_analysis: AudienceAnalysis
    learning_objectives: list[LearningObjective] = Field(min_length=3, max_length=8)
    modules: list[CourseModule] = Field(min_length=1, max_length=10)
    lesson_index: list[LessonIndexItem] = Field(min_length=1, max_length=50)
    teaching_strategy: TeachingStrategy
    assessment_plan: AssessmentPlan
    resource_plan: list[ResourcePlanItem] = Field(min_length=1, max_length=7)
    quality_checklist: list[str] = Field(min_length=3, max_length=8)


class DetailedCoursePlan(CoursePlanBase):
    detail_mode: Literal["detailed"]
    lesson_details: list[LessonDetail] = Field(min_length=1, max_length=20)


class BalancedCoursePlan(CoursePlanBase):
    detail_mode: Literal["balanced"]
    phases: list[CoursePhase] = Field(min_length=3, max_length=5)
    key_lesson_details: list[LessonDetail] = Field(min_length=5, max_length=10)


CoursePlan = Annotated[
    DetailedCoursePlan | BalancedCoursePlan,
    Field(discriminator="detail_mode"),
]


class TokenUsage(ApiModel):
    prompt_tokens: int = Field(ge=0)
    prompt_cache_hit_tokens: int = Field(ge=0)
    prompt_cache_miss_tokens: int = Field(ge=0)
    completion_tokens: int = Field(ge=0)
    total_tokens: int = Field(ge=0)
    estimated_cost_usd: float | None = Field(default=None, ge=0)
    pricing_snapshot: str | None = None


class GenerationMetadata(ApiModel):
    provider: str = Field(min_length=1)
    model: str = Field(min_length=1)
    detail_mode: DetailMode
    prompt_version: str
    attempts: int = Field(ge=1, le=2)
    generated_at: datetime
    usage: TokenUsage


class CoursePlanGenerateResponse(ApiModel):
    schema_version: Literal["1.0"] = "1.0"
    request_id: str
    status: Literal["succeeded"] = "succeeded"
    course_plan: CoursePlan
    generation: GenerationMetadata


class ApiError(ApiModel):
    code: str
    message: str
    retryable: bool
    request_id: str


class ErrorResponse(ApiModel):
    error: ApiError
