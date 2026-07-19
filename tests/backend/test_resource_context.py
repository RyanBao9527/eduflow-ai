from backend.models.resource_generation import ResourceGenerateRequest
from backend.services.resource_context import (
    RESOURCE_CONTEXT_VERSION,
    ResourceConsistencyError,
    build_resource_context,
    validate_resource_consistency,
)
from tests.backend.test_resource_generation import (
    make_course_plan,
    make_lesson_plan,
    make_request,
    make_slide_outline,
)
from backend.models.resource_generation import (
    GeneratedLessonPlanResource,
    GeneratedSlideOutlineResource,
)


def test_builds_canonical_lesson_context_from_existing_request_contract() -> None:
    request = ResourceGenerateRequest.model_validate(make_request())

    context = build_resource_context(request)

    assert context["contextVersion"] == RESOURCE_CONTEXT_VERSION
    assert context["lessonModel"] == {
        "lessonId": "L001",
        "moduleId": "M01",
        "lessonNumber": 1,
        "lessonTitle": "认识重复任务",
        "lessonObjectives": ["识别生活中的重复行为"],
        "keyConcepts": ["重复", "循环"],
        "difficulty": "beginner",
        "durationMinutes": 45,
        "teachingFlow": ["观察重复任务", "完成循环体验活动"],
        "activities": ["观察重复任务", "完成循环体验活动"],
        "assessmentPoints": ["完成课堂任务"],
    }
    assert context["learnerContext"]["learnerLevel"] == "零基础"
    assert context["moduleContext"]["moduleId"] == "M01"


def test_context_is_identical_for_both_supported_resource_types() -> None:
    lesson_plan_request = ResourceGenerateRequest.model_validate(make_request())
    slide_request = ResourceGenerateRequest.model_validate(
        make_request("slide_outline")
    )

    lesson_plan_context = build_resource_context(lesson_plan_request)
    slide_context = build_resource_context(slide_request)

    assert lesson_plan_context["lessonModel"] == slide_context["lessonModel"]
    assert lesson_plan_context["learnerContext"] == slide_context["learnerContext"]
    assert lesson_plan_context["courseContext"] == slide_context["courseContext"]


def test_accepts_grounded_lesson_plan_and_slide_outline() -> None:
    request = ResourceGenerateRequest.model_validate(make_request())
    context = build_resource_context(request)

    validate_resource_consistency(
        GeneratedLessonPlanResource.model_validate(make_lesson_plan()),
        context,
    )
    validate_resource_consistency(
        GeneratedSlideOutlineResource.model_validate(make_slide_outline()),
        context,
    )


def test_rejects_resource_key_points_outside_lesson_context() -> None:
    request = ResourceGenerateRequest.model_validate(make_request())
    context = build_resource_context(request)
    payload = make_lesson_plan()
    payload["content"]["keyPoints"] = ["神经网络"]
    resource = GeneratedLessonPlanResource.model_validate(payload)

    try:
        validate_resource_consistency(resource, context)
    except ResourceConsistencyError:
        pass
    else:  # pragma: no cover - explicit assertion message
        raise AssertionError("ungrounded resource should be rejected")


def test_resource_context_does_not_change_request_contract() -> None:
    payload = make_request()
    request = ResourceGenerateRequest.model_validate(payload)

    assert request.model_dump(by_alias=True, mode="json", exclude_none=True) == payload
    assert "resourceContext" not in payload
    assert "artifacts" not in payload
