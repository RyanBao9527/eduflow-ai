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
            "hasExplicitLessonDetail": lesson_detail is not None,
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
    """Reject resources that drift from the canonical lesson teaching model."""
    lesson_model = context["lessonModel"]
    allowed_concepts = lesson_model["keyConcepts"]

    if isinstance(resource, GeneratedLessonPlanResource):
        generated_concepts = resource.content.key_points
        objective_text = resource.content.objectives
        stage_text = [
            " ".join(
                [
                    stage.title,
                    *stage.teacher_activities,
                    *stage.learner_activities,
                ]
            )
            for stage in resource.content.stages
        ]
    elif isinstance(resource, GeneratedSlideOutlineResource):
        generated_concepts = [
            point
            for slide in resource.content.slides
            for point in slide.key_points
        ]
        objective_text = [
            " ".join(
                [slide.title, slide.purpose, slide.speaker_notes]
            )
            for slide in resource.content.slides
        ]
        stage_text = objective_text
    else:  # pragma: no cover - GeneratedResource currently has two variants
        return

    _reject_ungrounded(generated_concepts, allowed_concepts)
    _require_coverage(
        "learning objectives",
        lesson_model["lessonObjectives"],
        objective_text,
    )
    _require_coverage("key concepts", lesson_model["keyConcepts"], generated_concepts)

    if lesson_model["hasExplicitLessonDetail"]:
        _require_coverage("teaching flow", lesson_model["teachingFlow"], stage_text)
        _require_coverage("activities", lesson_model["activities"], stage_text)


def _reject_ungrounded(values: list[str], allowed_values: list[str]) -> None:
    ungrounded = [
        value for value in values if not _is_grounded(value, allowed_values)
    ]
    if ungrounded:
        raise ResourceConsistencyError(
            "Generated resource contains key points outside the canonical lesson context"
        )


def _require_coverage(
    label: str,
    expected_values: list[str],
    generated_values: list[str],
) -> None:
    missing = [
        expected
        for expected in expected_values
        if not any(_is_semantically_related(expected, value) for value in generated_values)
    ]
    if missing:
        raise ResourceConsistencyError(
            f"Generated resource does not cover canonical {label}"
        )


def _is_grounded(value: str, allowed_values: list[str]) -> bool:
    normalized = _normalize(value)
    if not normalized:
        return False
    return any(
        allowed and (allowed in normalized or normalized in allowed)
        for allowed in (_normalize(item) for item in allowed_values)
    )


def _is_semantically_related(expected: str, actual: str) -> bool:
    expected_normalized = _normalize(expected)
    actual_normalized = _normalize(actual)
    if not expected_normalized or not actual_normalized:
        return False
    if (
        expected_normalized in actual_normalized
        or actual_normalized in expected_normalized
    ):
        return True

    expected_tokens = _meaningful_tokens(expected)
    actual_tokens = _meaningful_tokens(actual)
    if not expected_tokens or not actual_tokens:
        return False
    shared_tokens = expected_tokens & actual_tokens
    return len(shared_tokens) >= min(2, len(expected_tokens))


def _meaningful_tokens(value: str) -> set[str]:
    english_tokens = set(re.findall(r"[a-z0-9]{2,}", value.lower()))
    chinese_tokens = {
        value[index : index + 2]
        for index in range(len(value) - 1)
        if re.fullmatch(r"[\u4e00-\u9fff]{2}", value[index : index + 2])
    }
    return english_tokens | chinese_tokens


def _normalize(value: str) -> str:
    return re.sub(r"[^0-9a-zA-Z\u4e00-\u9fff]+", "", value).lower()
