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

SLIDE_STRUCTURAL_TERMS = (
    "学习目标",
    "课堂任务",
    "练习",
    "实践",
    "总结",
    "回顾",
    "步骤",
    "要求",
    "活动",
    "评价",
    "流程图",
    "示意图",
    "图示",
)

SLIDE_STRUCTURAL_MODIFIERS = (
    "本课",
    "课程",
    "课堂",
    "教学",
    "活动",
    "内容",
    "说明",
    "安排",
    "操作",
    "完成",
    "学生",
    "学员",
    "教师",
    "阶段",
    "环节",
    "任务",
    "目标",
    "使用",
    "展示",
    "呈现",
    "视觉",
    "简单",
    "幻灯片",
    "图片",
    "示例",
    "与",
    "和",
    "及",
    "的",
)

SLIDE_KNOWLEDGE_SPLITTER = re.compile(r"以及|与|和|及|、|同|或")
SLIDE_EXPLANATORY_PREFIXES = (
    "介绍",
    "讲解",
    "说明",
    "展示",
    "呈现",
    "使用",
    "围绕",
    "通过",
    "结合",
    "认识",
    "理解",
    "掌握",
    "回顾",
    "总结",
    "完成",
    "引导",
    "组织",
    "带领",
    "帮助",
)
SLIDE_EXPLANATORY_SUFFIXES = (
    "的关系",
    "关系",
    "基础",
    "概念",
    "内容",
    "方法",
    "原理",
    "作用",
    "应用",
    "任务",
    "活动",
    "步骤",
    "示意图",
    "流程图",
    "图示",
    "练习",
    "实践",
    "要求",
)
SLIDE_TEACHING_ACTION_TERMS = (
    "掌握",
    "理解",
    "学习",
    "认识",
    "了解",
    "使用",
    "完成",
    "练习",
    "复习",
    "巩固",
    "应用",
)
SLIDE_CONTEXTUAL_TERMS = (
    "重复执行",
    "生活案例",
    "课堂",
    "课程",
    "教学",
    "学生",
    "学员",
    "教师",
    "活动",
    "任务",
    "实践",
    "目标",
    "要求",
    "步骤",
    "总结",
    "回顾",
    "用于",
    "通过",
    "执行",
    "观察",
    "识别",
    "组织",
    "体验",
    "结合",
    "案例",
    "讲解",
    "介绍",
    "带领",
    "帮助",
    "生活",
    "行为",
    "知识",
    "关系",
    "概念",
    "结构",
    "内容",
    "方法",
    "作用",
    "原理",
    "基础",
    "视觉",
    "简单",
    "流程图",
    "示意图",
    "图示",
    "幻灯片",
    "图片",
    "页",
    "在",
    "中",
    "的",
    "并",
)


class ResourceConsistencyError(ValueError):
    def __init__(self, failure_type: str, message: str) -> None:
        super().__init__(message)
        self.failure_type = failure_type


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
        _reject_ungrounded(generated_concepts, allowed_concepts)
        _require_coverage(
            "learning objectives",
            lesson_model["lessonObjectives"],
            objective_text,
        )
        _require_coverage("key concepts", allowed_concepts, generated_concepts)
    elif isinstance(resource, GeneratedSlideOutlineResource):
        slide_content_text = [resource.content.overview]
        for slide in resource.content.slides:
            slide_content_text.extend(
                [
                    slide.title,
                    slide.purpose,
                    *slide.key_points,
                    slide.visual_suggestion,
                    slide.speaker_notes,
                ]
            )
        _reject_ungrounded_slide_content(slide_content_text, allowed_concepts)
        _require_coverage(
            "learning objectives",
            lesson_model["lessonObjectives"],
            slide_content_text,
        )
        _require_coverage("key concepts", allowed_concepts, slide_content_text)
        stage_text = slide_content_text
    else:  # pragma: no cover - GeneratedResource currently has two variants
        return

    if lesson_model["hasExplicitLessonDetail"]:
        _require_coverage("teaching flow", lesson_model["teachingFlow"], stage_text)
        _require_coverage("activities", lesson_model["activities"], stage_text)


def _reject_ungrounded(values: list[str], allowed_values: list[str]) -> None:
    ungrounded = [
        value for value in values if not _is_grounded(value, allowed_values)
    ]
    if ungrounded:
        raise ResourceConsistencyError(
            "extra concepts",
            "Generated resource contains key points outside the canonical lesson context",
        )


def _reject_ungrounded_slide_content(
    values: list[str],
    allowed_values: list[str],
) -> None:
    ungrounded = [
        value
        for value in values
        if not _is_structural_slide_point(value)
        and any(
            not _is_grounded_slide_knowledge(candidate, allowed_values)
            for candidate in _slide_knowledge_candidates(value)
            if not _is_structural_slide_point(candidate)
        )
    ]
    if ungrounded:
        raise ResourceConsistencyError(
            "extra concepts",
            "Generated slide outline contains content outside the canonical lesson context",
        )


def _slide_knowledge_candidates(value: str) -> list[str]:
    normalized = _normalize(value)
    candidates: list[str] = []
    for chunk in SLIDE_KNOWLEDGE_SPLITTER.split(normalized):
        candidate = chunk
        for prefix in sorted(SLIDE_EXPLANATORY_PREFIXES, key=len, reverse=True):
            if candidate.startswith(prefix):
                candidate = candidate[len(prefix) :]
                break
        for suffix in sorted(SLIDE_EXPLANATORY_SUFFIXES, key=len, reverse=True):
            if candidate.endswith(suffix):
                candidate = candidate[: -len(suffix)]
                break
        if candidate:
            candidates.append(candidate)
    return candidates


def _is_grounded_slide_knowledge(candidate: str, allowed_values: list[str]) -> bool:
    normalized = _normalize(candidate)
    if not normalized:
        return False

    remainder = normalized
    matched_concept = False
    for concept in sorted((_normalize(value) for value in allowed_values), key=len, reverse=True):
        if concept and concept in remainder:
            remainder = remainder.replace(concept, "")
            matched_concept = True

    if not matched_concept:
        return False

    remainder = re.sub(r"[0-9一二三四五六七八九十]+", "", remainder)
    structural_terms = (*SLIDE_STRUCTURAL_TERMS, *SLIDE_STRUCTURAL_MODIFIERS)
    for term in sorted(structural_terms, key=len, reverse=True):
        remainder = remainder.replace(_normalize(term), "")
    for term in sorted(SLIDE_TEACHING_ACTION_TERMS, key=len, reverse=True):
        remainder = remainder.replace(_normalize(term), "")
    for term in sorted(SLIDE_CONTEXTUAL_TERMS, key=len, reverse=True):
        remainder = remainder.replace(_normalize(term), "")
    return not remainder


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
        failure_type = {
            "learning objectives": "objective mismatch",
            "key concepts": "missing concepts",
            "teaching flow": "flow mismatch",
            "activities": "flow mismatch",
        }.get(label, "consistency mismatch")
        raise ResourceConsistencyError(
            failure_type,
            f"Generated resource does not cover canonical {label}",
        )


def _is_structural_slide_point(value: str) -> bool:
    remainder = _normalize(value)
    if not remainder:
        return False
    terms = sorted(
        (*SLIDE_STRUCTURAL_TERMS, *SLIDE_STRUCTURAL_MODIFIERS),
        key=len,
        reverse=True,
    )
    for term in terms:
        remainder = remainder.replace(_normalize(term), "")
    return not remainder


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
