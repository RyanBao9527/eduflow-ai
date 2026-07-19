import pytest

from backend.models.resource_generation import (
    GeneratedLessonPlanResource,
    GeneratedSlideOutlineResource,
    ResourceGenerateRequest,
)
from backend.services.resource_context import (
    RESOURCE_CONTEXT_VERSION,
    ResourceConsistencyError,
    build_resource_context,
    validate_resource_consistency,
)
from tests.backend.test_resource_generation import (
    make_lesson_plan,
    make_request,
    make_slide_outline,
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
        "hasExplicitLessonDetail": True,
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


def test_rejects_module_only_knowledge_point() -> None:
    request = ResourceGenerateRequest.model_validate(make_request())
    request.course_plan.modules[0].key_concepts.append("函数")
    context = build_resource_context(request)
    payload = make_lesson_plan()
    payload["content"]["keyPoints"] = ["重复", "循环", "函数"]
    resource = GeneratedLessonPlanResource.model_validate(payload)

    with pytest.raises(ResourceConsistencyError, match="outside the canonical") as exc_info:
        validate_resource_consistency(resource, context)
    assert exc_info.value.failure_type == "extra concepts"


def test_lesson_plan_keeps_strict_key_point_validation() -> None:
    request = ResourceGenerateRequest.model_validate(make_request())
    context = build_resource_context(request)
    payload = make_lesson_plan()
    payload["content"]["keyPoints"] = ["重复", "循环", "课堂任务"]
    resource = GeneratedLessonPlanResource.model_validate(payload)

    with pytest.raises(ResourceConsistencyError) as exc_info:
        validate_resource_consistency(resource, context)
    assert exc_info.value.failure_type == "extra concepts"


def test_rejects_resource_with_mismatched_learning_objectives() -> None:
    request = ResourceGenerateRequest.model_validate(make_request())
    context = build_resource_context(request)
    payload = make_lesson_plan()
    payload["content"]["objectives"] = ["掌握神经网络"]
    resource = GeneratedLessonPlanResource.model_validate(payload)

    with pytest.raises(ResourceConsistencyError, match="learning objectives") as exc_info:
        validate_resource_consistency(resource, context)
    assert exc_info.value.failure_type == "objective mismatch"


def test_rejects_resource_with_mismatched_teaching_flow() -> None:
    request = ResourceGenerateRequest.model_validate(make_request())
    context = build_resource_context(request)
    payload = make_lesson_plan()
    for stage in payload["content"]["stages"]:
        stage["title"] = "循环概念讲解"
        stage["teacherActivities"] = ["讲解循环概念"]
        stage["learnerActivities"] = ["记录循环概念"]
    resource = GeneratedLessonPlanResource.model_validate(payload)

    with pytest.raises(ResourceConsistencyError, match="teaching flow") as exc_info:
        validate_resource_consistency(resource, context)
    assert exc_info.value.failure_type == "flow mismatch"


def test_rejects_slide_outline_missing_a_lesson_key_concept() -> None:
    request = ResourceGenerateRequest.model_validate(make_request("slide_outline"))
    context = build_resource_context(request)
    context["lessonModel"]["lessonObjectives"] = ["完成循环体验活动"]
    context["lessonModel"]["teachingFlow"] = ["完成循环体验活动"]
    context["lessonModel"]["activities"] = ["完成循环体验活动"]
    payload = make_slide_outline()
    payload["content"]["overview"] = "使用六页幻灯片完成循环体验活动。"
    for slide in payload["content"]["slides"]:
        slide["title"] = slide["title"].replace("重复", "课堂")
        slide["purpose"] = slide["purpose"].replace("重复", "课堂")
        slide["keyPoints"] = ["循环概念"]
        slide["speakerNotes"] = slide["speakerNotes"].replace("重复", "课堂")
    resource = GeneratedSlideOutlineResource.model_validate(payload)

    with pytest.raises(ResourceConsistencyError, match="key concepts") as exc_info:
        validate_resource_consistency(resource, context)
    assert exc_info.value.failure_type == "missing concepts"


def test_accepts_structural_slide_points_with_overall_concept_coverage() -> None:
    request = ResourceGenerateRequest.model_validate(make_request("slide_outline"))
    context = build_resource_context(request)
    payload = make_slide_outline()
    structural_points = [
        "学习目标",
        "课堂任务",
        "练习要求",
        "实践步骤",
        "回顾",
        "总结",
    ]
    for slide, key_point in zip(payload["content"]["slides"], structural_points):
        slide["keyPoints"] = [key_point]
    resource = GeneratedSlideOutlineResource.model_validate(payload)

    validate_resource_consistency(resource, context)


def test_rejects_slide_outline_with_a_real_extra_concept() -> None:
    request = ResourceGenerateRequest.model_validate(make_request("slide_outline"))
    context = build_resource_context(request)
    payload = make_slide_outline()
    payload["content"]["slides"][0]["keyPoints"] = ["神经网络"]
    resource = GeneratedSlideOutlineResource.model_validate(payload)

    with pytest.raises(ResourceConsistencyError) as exc_info:
        validate_resource_consistency(resource, context)
    assert exc_info.value.failure_type == "extra concepts"


def test_resource_context_does_not_change_request_contract() -> None:
    payload = make_request()
    request = ResourceGenerateRequest.model_validate(payload)

    assert request.model_dump(by_alias=True, mode="json", exclude_none=True) == payload
    assert "resourceContext" not in payload
    assert "artifacts" not in payload
