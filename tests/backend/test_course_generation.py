import json
from typing import Any

import pytest
from fastapi.testclient import TestClient

from backend.config import Settings
from backend.main import app
from backend.models.course_generation import CourseBrief
from backend.prompts.course_blueprint import (
    PROMPT_VERSION,
    SYSTEM_PROMPT,
    build_structured_output_request,
    key_lesson_count,
    max_output_tokens,
    select_detail_mode,
)
from backend.services.course_generation import (
    CourseGenerationInvalidOutputError,
    CourseGenerationService,
)
from backend.services.llm.base import (
    LLMUsage,
    StructuredOutputRequest,
    StructuredOutputResult,
)


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


class FakeProvider:
    def __init__(self, responses: list[str]) -> None:
        self.responses = responses
        self.requests: list[StructuredOutputRequest] = []

    async def generate_structured_output(
        self,
        request: StructuredOutputRequest,
    ) -> StructuredOutputResult:
        self.requests.append(request)
        content = self.responses[min(len(self.requests) - 1, len(self.responses) - 1)]
        return StructuredOutputResult(
            content=content,
            provider="test-provider",
            model="test-model-v1",
            finish_reason="stop",
            usage=LLMUsage(
                prompt_tokens=100,
                prompt_cache_miss_tokens=100,
                completion_tokens=200,
                total_tokens=300,
            ),
        )


def make_settings(**overrides: Any) -> Settings:
    values = {
        "LLM_PROVIDER": "test-provider",
        "LLM_MODEL": "test-model-v1",
        "LLM_BASE_URL": "https://example.test",
        "LLM_API_KEY": "test-key",
        "LLM_INPUT_COST_PER_1M": 1.0,
        "LLM_OUTPUT_COST_PER_1M": 2.0,
        "LLM_PRICING_SNAPSHOT": "test-snapshot",
    }
    values.update(overrides)
    return Settings(**values)


def make_brief(lesson_count: int) -> CourseBrief:
    return CourseBrief.model_validate(
        {
            "courseTitle": f"{lesson_count}课时测试课程",
            "subject": "测试学科",
            "topic": "结构化课程设计",
            "teachingScenario": "offline",
            "targetLearners": "测试学习者",
            "ageOrGrade": "成人",
            "learnerLevel": "初级",
            "lessonDurationMinutes": 45,
            "lessonCount": lesson_count,
            "difficulty": "beginner",
            "teachingStyles": ["互动式"],
            "overallGoal": "建立完整且可验证的课程学习路径",
            "requestedResources": ["lesson_plan"],
        }
    )


def make_plan(lesson_count: int) -> dict[str, Any]:
    lesson_ids = [f"L{number:03d}" for number in range(1, lesson_count + 1)]
    balanced = lesson_count > 20
    if balanced:
        boundaries = [0, lesson_count // 3, lesson_count * 2 // 3, lesson_count]
        chunks = [lesson_ids[boundaries[i] : boundaries[i + 1]] for i in range(3)]
    else:
        chunks = [lesson_ids]
    modules = [
        {
            "moduleId": f"M{index:02d}",
            "title": f"模块{index}",
            "goal": f"完成第{index}阶段学习目标",
            "lessonIds": chunk,
            "keyConcepts": [f"概念{index}"],
        }
        for index, chunk in enumerate(chunks, start=1)
    ]
    lesson_to_module = {
        lesson_id: module["moduleId"]
        for module in modules
        for lesson_id in module["lessonIds"]
    }
    lesson_index = [
        {
            "lessonId": lesson_id,
            "moduleId": lesson_to_module[lesson_id],
            "lessonNumber": number,
            "title": f"第{number}课主题",
            "objective": f"完成第{number}课独立学习目标",
            "keyConcepts": [f"知识点{number}"],
            "durationMinutes": 30,
        }
        for number, lesson_id in enumerate(lesson_ids, start=1)
    ]
    common: dict[str, Any] = {
        "schemaVersion": "1.0",
        "detailMode": "balanced" if balanced else "detailed",
        "title": "模型返回标题",
        "positioning": "结构清晰且可持续扩展的课程",
        "overview": "通过连续且不重复的课时建立完整学习路径。",
        "assumptions": [],
        "audienceAnalysis": {
            "profile": "需要系统学习的初学者",
            "prerequisites": [],
            "learningNeeds": ["清晰结构"],
        },
        "learningObjectives": [
            {"objectiveId": f"OBJ{number:02d}", "statement": f"学习目标{number}", "evidence": f"证据{number}"}
            for number in range(1, 4)
        ],
        "modules": modules,
        "lessonIndex": lesson_index,
        "teachingStrategy": {
            "approach": "循序渐进",
            "learnerEngagement": "通过任务参与",
            "differentiation": ["提供分层任务"],
        },
        "assessmentPlan": {
            "diagnostic": "课前检查",
            "formative": "课中反馈",
            "summative": "结课任务",
        },
        "resourcePlan": [
            {
                "resourceType": "lesson_plan",
                "purpose": "支持课程实施",
                "moduleIds": [module["moduleId"] for module in modules],
                "lessonIds": [],
            }
        ],
        "qualityChecklist": ["结构完整", "课时不重复", "目标可评估"],
    }
    if not balanced:
        common["lessonDetails"] = [
            {
                "lessonId": lesson_id,
                "teachingActivities": [f"第{number}课活动"],
                "assessmentMethod": f"第{number}课评估",
            }
            for number, lesson_id in enumerate(lesson_ids, start=1)
        ]
        return common

    key_count = key_lesson_count(lesson_count)
    key_ids = [chunk[0] for chunk in chunks]
    key_ids.extend(lesson_id for lesson_id in lesson_ids if lesson_id not in key_ids)
    key_ids = key_ids[:key_count]
    common["phases"] = [
        {
            "phaseId": f"P{index:02d}",
            "title": f"阶段{index}",
            "goal": f"达成阶段{index}目标",
            "moduleIds": [f"M{index:02d}"],
            "lessonIds": chunk,
            "milestone": f"完成阶段{index}成果",
        }
        for index, chunk in enumerate(chunks, start=1)
    ]
    common["keyLessonDetails"] = [
        {
            "lessonId": lesson_id,
            "teachingActivities": [f"{lesson_id}关键活动"],
            "assessmentMethod": f"{lesson_id}关键评估",
        }
        for lesson_id in key_ids
    ]
    return common


@pytest.mark.parametrize(
    ("lesson_count", "expected"),
    [(1, "detailed"), (10, "detailed"), (20, "detailed"), (21, "balanced"), (50, "balanced")],
)
def test_detail_mode_boundaries(lesson_count: int, expected: str) -> None:
    assert select_detail_mode(lesson_count) == expected


def test_token_budget_is_bounded() -> None:
    assert max_output_tokens(1, "detailed", 8000) == 3250
    assert max_output_tokens(20, "detailed", 8000) == 8000
    assert max_output_tokens(21, "balanced", 8000) == 5050
    assert max_output_tokens(50, "balanced", 8000) == 6500


def test_prompt_treats_requested_resources_as_planning_only() -> None:
    request = build_structured_output_request(
        brief=make_brief(1),
        request_id="request-1",
        configured_token_limit=8000,
        temperature=0.2,
    )

    assert PROMPT_VERSION == "course-blueprint-v3"
    assert "不代表当前需要生成资源正文" in SYSTEM_PROMPT
    assert "不要生成任何完整教学资源内容" in SYSTEM_PROMPT
    assert "只输出资源规划信息" in SYSTEM_PROMPT
    assert "resourcePlan 不得包含任何资源正文或文件内容" in request.user_prompt
    lesson_detail_schema = request.json_schema["$defs"]["LessonDetail"]
    assert "resourceRefs" not in lesson_detail_schema["properties"]


@pytest.mark.anyio
@pytest.mark.parametrize("lesson_count", [1, 10, 20, 21, 50])
async def test_service_generates_valid_blueprints(lesson_count: int) -> None:
    provider = FakeProvider([json.dumps(make_plan(lesson_count), ensure_ascii=False)])
    service = CourseGenerationService(provider, make_settings())

    response = await service.generate(make_brief(lesson_count), "request-1")

    assert response.course_plan.detail_mode == select_detail_mode(lesson_count)
    assert len(response.course_plan.lesson_index) == lesson_count
    assert response.course_plan.title == f"{lesson_count}课时测试课程"
    assert all(item.duration_minutes == 45 for item in response.course_plan.lesson_index)
    assert response.generation.provider == "test-provider"
    assert response.generation.model == "test-model-v1"
    assert response.generation.usage.total_tokens == 300
    assert response.generation.usage.estimated_cost_usd == 0.0005
    assert len(provider.requests) == 1
    assert len(provider.responses[0].encode("utf-8")) < 262_144


@pytest.mark.anyio
async def test_invalid_output_retries_once() -> None:
    provider = FakeProvider(["{}", json.dumps(make_plan(1), ensure_ascii=False)])
    response = await CourseGenerationService(provider, make_settings()).generate(
        make_brief(1), "request-retry"
    )

    assert response.generation.attempts == 2
    assert response.generation.usage.total_tokens == 600
    assert len(provider.requests) == 2
    assert "格式修复重试" in provider.requests[1].user_prompt


@pytest.mark.anyio
async def test_duplicate_lessons_are_rejected_after_one_retry() -> None:
    plan = make_plan(2)
    plan["lessonIndex"][1]["title"] = plan["lessonIndex"][0]["title"]
    plan["lessonIndex"][1]["objective"] = plan["lessonIndex"][0]["objective"]
    provider = FakeProvider([json.dumps(plan, ensure_ascii=False)])

    with pytest.raises(CourseGenerationInvalidOutputError):
        await CourseGenerationService(provider, make_settings()).generate(
            make_brief(2), "request-duplicate"
        )
    assert len(provider.requests) == 2


def test_api_rejects_courses_over_50_before_provider_call() -> None:
    client = TestClient(app)
    brief = make_brief(50).model_dump(by_alias=True)
    brief["lessonCount"] = 51

    response = client.post(
        "/api/v1/course-plans/generate",
        json={"schemaVersion": "1.0", "courseBrief": brief},
    )

    assert response.status_code == 422
