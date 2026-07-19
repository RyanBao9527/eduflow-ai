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
    payload["content"]["overview"] = "课堂练习"
    for slide in payload["content"]["slides"]:
        slide["title"] = "课堂练习"
        slide["purpose"] = "练习要求"
        slide["keyPoints"] = ["循环概念"]
        slide["visualSuggestion"] = "使用简单流程图"
        slide["speakerNotes"] = "完成练习并回顾循环概念"
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


def test_rejects_mixed_allowed_and_extra_slide_knowledge() -> None:
    request = ResourceGenerateRequest.model_validate(make_request("slide_outline"))
    context = build_resource_context(request)
    payload = make_slide_outline()
    payload["content"]["slides"][0]["keyPoints"] = ["循环与神经网络的关系"]
    resource = GeneratedSlideOutlineResource.model_validate(payload)

    with pytest.raises(ResourceConsistencyError) as exc_info:
        validate_resource_consistency(resource, context)
    assert exc_info.value.failure_type == "extra concepts"


@pytest.mark.parametrize(
    "value",
    ["循环神经网络", "循环在神经网络中的应用"],
)
def test_rejects_embedded_extra_knowledge_without_a_connector(value: str) -> None:
    request = ResourceGenerateRequest.model_validate(make_request("slide_outline"))
    context = build_resource_context(request)
    payload = make_slide_outline()
    payload["content"]["slides"][0]["keyPoints"] = [value]
    resource = GeneratedSlideOutlineResource.model_validate(payload)

    with pytest.raises(ResourceConsistencyError) as exc_info:
        validate_resource_consistency(resource, context)
    assert exc_info.value.failure_type == "extra concepts"


def test_accepts_grounded_slide_explanation_with_contextual_words() -> None:
    request = ResourceGenerateRequest.model_validate(make_request("slide_outline"))
    context = build_resource_context(request)
    payload = make_slide_outline()
    payload["content"]["slides"][0]["keyPoints"] = ["循环用于重复执行任务"]
    resource = GeneratedSlideOutlineResource.model_validate(payload)

    validate_resource_consistency(resource, context)


def test_accepts_combined_key_concepts_with_a_structural_expression() -> None:
    request = ResourceGenerateRequest.model_validate(make_request("slide_outline"))
    context = build_resource_context(request)
    context["lessonModel"]["keyConcepts"].append("列表")
    payload = make_slide_outline()
    payload["content"]["slides"][0]["keyPoints"] = ["列表循环练习"]
    resource = GeneratedSlideOutlineResource.model_validate(payload)

    validate_resource_consistency(resource, context)


def test_accepts_key_concept_with_a_structural_expression() -> None:
    request = ResourceGenerateRequest.model_validate(make_request("slide_outline"))
    context = build_resource_context(request)
    payload = make_slide_outline()
    payload["content"]["slides"][0]["keyPoints"] = ["循环课堂练习"]
    resource = GeneratedSlideOutlineResource.model_validate(payload)

    validate_resource_consistency(resource, context)


def test_accepts_grounded_knowledge_with_structural_expression() -> None:
    request = ResourceGenerateRequest.model_validate(make_request("slide_outline"))
    context = build_resource_context(request)
    payload = make_slide_outline()
    payload["content"]["slides"][0]["keyPoints"] = ["循环与课堂练习"]
    resource = GeneratedSlideOutlineResource.model_validate(payload)

    validate_resource_consistency(resource, context)


def test_rejects_activity_term_that_is_not_a_key_concept() -> None:
    request = ResourceGenerateRequest.model_validate(make_request("slide_outline"))
    context = build_resource_context(request)
    context["lessonModel"]["activities"] = ["列表操作"]
    payload = make_slide_outline()
    payload["content"]["slides"][0]["keyPoints"] = ["列表和循环"]
    resource = GeneratedSlideOutlineResource.model_validate(payload)

    with pytest.raises(ResourceConsistencyError) as exc_info:
        validate_resource_consistency(resource, context)
    assert exc_info.value.failure_type == "extra concepts"


def test_accepts_multiple_structural_expressions() -> None:
    request = ResourceGenerateRequest.model_validate(make_request("slide_outline"))
    context = build_resource_context(request)
    payload = make_slide_outline()
    payload["content"]["slides"][0]["keyPoints"] = ["学习目标、课堂练习、总结"]
    resource = GeneratedSlideOutlineResource.model_validate(payload)

    validate_resource_consistency(resource, context)


def test_accepts_structural_slide_text_with_grounded_concept() -> None:
    request = ResourceGenerateRequest.model_validate(make_request("slide_outline"))
    context = build_resource_context(request)
    payload = make_slide_outline()
    payload["content"]["slides"][0]["title"] = "课堂练习"
    payload["content"]["slides"][0]["speakerNotes"] = "使用循环完成任务"
    resource = GeneratedSlideOutlineResource.model_validate(payload)

    validate_resource_consistency(resource, context)


def test_rejects_extra_knowledge_across_multiple_slide_fields() -> None:
    request = ResourceGenerateRequest.model_validate(make_request("slide_outline"))
    context = build_resource_context(request)
    payload = make_slide_outline()
    payload["content"]["slides"][0]["title"] = "循环概念"
    payload["content"]["slides"][0]["speakerNotes"] = "循环与神经网络的关系"
    resource = GeneratedSlideOutlineResource.model_validate(payload)

    with pytest.raises(ResourceConsistencyError) as exc_info:
        validate_resource_consistency(resource, context)
    assert exc_info.value.failure_type == "extra concepts"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("title", "神经网络基础"),
        ("purpose", "介绍神经网络基础"),
        ("visualSuggestion", "展示神经网络示意图"),
        ("speakerNotes", "讲解神经网络基础"),
    ],
)
def test_rejects_extra_concept_in_any_slide_content_field(
    field: str,
    value: str,
) -> None:
    request = ResourceGenerateRequest.model_validate(make_request("slide_outline"))
    context = build_resource_context(request)
    payload = make_slide_outline()
    payload["content"]["slides"][0][field] = value
    resource = GeneratedSlideOutlineResource.model_validate(payload)

    with pytest.raises(ResourceConsistencyError) as exc_info:
        validate_resource_consistency(resource, context)
    assert exc_info.value.failure_type == "extra concepts"


def test_accepts_structural_slide_text_across_content_fields() -> None:
    request = ResourceGenerateRequest.model_validate(make_request("slide_outline"))
    context = build_resource_context(request)
    payload = make_slide_outline()
    first_slide = payload["content"]["slides"][0]
    first_slide["title"] = "课堂练习"
    first_slide["purpose"] = "练习要求"
    first_slide["keyPoints"] = ["活动"]
    first_slide["visualSuggestion"] = "使用简单流程图"
    first_slide["speakerNotes"] = "完成练习并回顾循环概念"
    resource = GeneratedSlideOutlineResource.model_validate(payload)

    validate_resource_consistency(resource, context)


def test_resource_context_does_not_change_request_contract() -> None:
    payload = make_request()
    request = ResourceGenerateRequest.model_validate(payload)

    assert request.model_dump(by_alias=True, mode="json", exclude_none=True) == payload
    assert "resourceContext" not in payload
    assert "artifacts" not in payload
