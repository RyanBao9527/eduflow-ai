import re
from typing import Any

from backend.models.course_generation import DetailedCoursePlan
from backend.models.resource_generation import (
    GeneratedLessonPlanResource,
    GeneratedResource,
    GeneratedSlideOutlineResource,
    ResourceGenerateRequest,
)

RESOURCE_CONTEXT_VERSION = "1.0"


class ResourceConsistencyError(ValueError):
    pass


def build_resource_context(request: ResourceGenerateRequest) -> dict[str, Any]:
    """Build the canonical lesson model shared by every generated resource."""
    plan = request.course_plan
    lesson = next(
        item for item in plan.lesson_index if item.lesson_id == request.lesson_id
    )
    module = next(item for item in plan.modules if item.module_id == lesson.module_id)
    lesson_position = next(
        index
        for index, item in enumerate(plan.lesson_index)
        if item.lesson_id == request.lesson_id
    )
    adjacent_lessons = plan.lesson_index[
        max(0, lesson_position - 1) : lesson_position + 2
    ]
    details = (
        plan.lesson_details
        if isinstance(plan, DetailedCoursePlan)
        else plan.key_lesson_details
    )
    lesson_detail = next(
        (item for item in details if item.lesson_id == request.lesson_id),
        None,
    )
    planned_resource_type = (
        "lesson_plan" if request.resource_type == "lesson_plan" else "slides"
    )
    resource_plan = next(
        (
            item
            for item in plan.resource_plan
            if item.resource_type == planned_resource_type
        ),
        None,
    )

    teaching_flow = (
        list(lesson_detail.teaching_activities)
        if lesson_detail
        else [
            plan.teaching_strategy.approach,
            plan.teaching_strategy.learner_engagement,
        ]
    )
    assessment_points = (
        [lesson_detail.assessment_method]
        if lesson_detail
        else [plan.assessment_plan.formative]
    )

    return {
        "contextVersion": RESOURCE_CONTEXT_VERSION,
        "lessonModel": {
            "lessonId": lesson.lesson_id,
            "moduleId": lesson.module_id,
            "lessonNumber": lesson.lesson_number,
            "lessonTitle": lesson.title,
            "lessonObjectives": [lesson.objective],
            "keyConcepts": list(lesson.key_concepts),
            "difficulty": request.course_brief.difficulty,
            "durationMinutes": lesson.duration_minutes,
            "teachingFlow": teaching_flow,
            "activities": teaching_flow,
            "assessmentPoints": assessment_points,
        },
        "learnerContext": {
            "targetLearners": request.course_brief.target_learners,
            "ageOrGrade": request.course_brief.age_or_grade,
            "learnerLevel": request.course_brief.learner_level,
            "classSize": request.course_brief.class_size,
            "teachingScenario": request.course_brief.teaching_scenario,
        },
        "courseContext": {
            "title": plan.title,
            "positioning": plan.positioning,
            "overview": plan.overview,
            "overallGoal": request.course_brief.overall_goal,
            "teachingStrategy": plan.teaching_strategy.model_dump(by_alias=True),
            "assessmentPlan": plan.assessment_plan.model_dump(by_alias=True),
        },
        "moduleContext": {
            "moduleId": module.module_id,
            "title": module.title,
            "goal": module.goal,
            "keyConcepts": list(module.key_concepts),
        },
        "adjacentLessons": [
            {
                "lessonId": item.lesson_id,
                "title": item.title,
                "objective": item.objective,
            }
            for item in adjacent_lessons
        ],
        "resourcePlan": (
            resource_plan.model_dump(by_alias=True) if resource_plan else None
        ),
    }


def validate_resource_consistency(
    resource: GeneratedResource,
    context: dict[str, Any],
) -> None:
    """Reject resources whose declared knowledge points leave the lesson model."""
    lesson_model = context["lessonModel"]
    allowed_concepts = [
        *lesson_model["keyConcepts"],
        *context["moduleContext"]["keyConcepts"],
    ]

    if isinstance(resource, GeneratedLessonPlanResource):
        generated_concepts = resource.content.key_points
    elif isinstance(resource, GeneratedSlideOutlineResource):
        generated_concepts = [
            point
            for slide in resource.content.slides
            for point in slide.key_points
        ]
    else:  # pragma: no cover - GeneratedResource currently has two variants
        return

    ungrounded = [
        concept
        for concept in generated_concepts
        if not _is_grounded(concept, allowed_concepts)
    ]
    if ungrounded:
        raise ResourceConsistencyError(
            "Generated resource contains key points outside the canonical lesson context"
        )


def _is_grounded(value: str, allowed_values: list[str]) -> bool:
    normalized = _normalize(value)
    if not normalized:
        return False
    return any(
        allowed and (allowed in normalized or normalized in allowed)
        for allowed in (_normalize(item) for item in allowed_values)
    )


def _normalize(value: str) -> str:
    return re.sub(r"[^0-9a-zA-Z\u4e00-\u9fff]+", "", value).lower()
