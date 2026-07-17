import json
from typing import Any

from fastapi.testclient import TestClient

from backend.main import app
from backend.prompts.resource_generation import PROMPT_VERSION, SYSTEM_PROMPT
from backend.services.llm.base import (
    LLMAuthenticationError,
    LLMRateLimitError,
    LLMUsage,
    StructuredOutputRequest,
    StructuredOutputResult,
)


class FakeProvider:
    def __init__(self, responses: list[str | Exception]) -> None:
        self.responses = responses
        self.requests: list[StructuredOutputRequest] = []

    async def generate_structured_output(
        self,
        request: StructuredOutputRequest,
    ) -> StructuredOutputResult:
        self.requests.append(request)
        response = self.responses[min(len(self.requests) - 1, len(self.responses) - 1)]
        if isinstance(response, Exception):
            raise response
        return StructuredOutputResult(
            content=response,
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


def make_course_brief() -> dict[str, Any]:
    return {
        "courseTitle": "Python 编程启蒙",
        "subject": "编程",
        "topic": "循环结构",
        "teachingScenario": "offline",
        "targetLearners": "小学高年级学生",
        "ageOrGrade": "小学高年级",
        "learnerLevel": "零基础",
        "lessonDurationMinutes": 45,
        "lessonCount": 1,
        "difficulty": "beginner",
        "teachingStyles": ["互动式"],
        "overallGoal": "理解循环并完成基础编程任务",
        "requestedResources": ["lesson_plan", "slides"],
    }


def make_course_plan() -> dict[str, Any]:
    return {
        "schemaVersion": "1.0",
        "detailMode": "detailed",
        "title": "Python 编程启蒙",
        "positioning": "面向零基础学习者的实践课程",
        "overview": "通过连续任务建立编程基础。",
        "assumptions": [],
        "audienceAnalysis": {
            "profile": "小学高年级零基础学生",
            "prerequisites": ["基本电脑操作"],
            "learningNeeds": ["即时反馈"],
        },
        "learningObjectives": [
            {
                "objectiveId": "OBJ01",
                "statement": "识别重复任务",
                "evidence": "完成识别练习",
            },
            {
                "objectiveId": "OBJ02",
                "statement": "理解循环用途",
                "evidence": "解释循环用途",
            },
            {
                "objectiveId": "OBJ03",
                "statement": "应用循环",
                "evidence": "完成编程任务",
            },
        ],
        "modules": [
            {
                "moduleId": "M01",
                "title": "循环入门",
                "goal": "理解循环结构",
                "lessonIds": ["L001"],
                "keyConcepts": ["重复", "循环"],
            }
        ],
        "lessonIndex": [
            {
                "lessonId": "L001",
                "moduleId": "M01",
                "lessonNumber": 1,
                "title": "认识重复任务",
                "objective": "识别生活中的重复行为",
                "keyConcepts": ["重复", "循环"],
                "durationMinutes": 45,
            }
        ],
        "lessonDetails": [
            {
                "lessonId": "L001",
                "teachingActivities": ["观察重复任务", "完成循环体验活动"],
                "assessmentMethod": "完成课堂任务",
            }
        ],
        "teachingStrategy": {
            "approach": "任务驱动",
            "learnerEngagement": "通过互动任务参与",
            "differentiation": ["提供分层任务"],
        },
        "assessmentPlan": {
            "diagnostic": "课前提问",
            "formative": "课堂观察",
            "summative": "结课任务",
        },
        "resourcePlan": [
            {
                "resourceType": "lesson_plan",
                "purpose": "支持教师实施课程",
                "moduleIds": ["M01"],
                "lessonIds": ["L001"],
            },
            {
                "resourceType": "slides",
                "purpose": "支持课堂视觉讲解",
                "moduleIds": ["M01"],
                "lessonIds": ["L001"],
            },
        ],
        "qualityChecklist": ["结构完整", "目标可评估", "课时无重复"],
    }


def make_request(resource_type: str = "lesson_plan") -> dict[str, Any]:
    return {
        "schemaVersion": "1.0",
        "courseProjectId": "5f535cf8-21ae-46ab-8313-cd0208f35d14",
        "resourceType": resource_type,
        "lessonId": "L001",
        "courseBrief": make_course_brief(),
        "coursePlan": make_course_plan(),
    }


def make_lesson_plan() -> dict[str, Any]:
    return {
        "resourceType": "lesson_plan",
        "moduleId": "M01",
        "lessonId": "L001",
        "title": "认识重复任务教师教案",
        "content": {
            "summary": "通过生活案例认识循环结构。",
            "objectives": ["识别重复任务", "解释循环用途"],
            "keyPoints": ["重复", "循环"],
            "difficultPoints": ["从生活步骤抽象循环结构"],
            "preparation": ["循环任务卡片"],
            "stages": [
                {
                    "stageId": "ST01",
                    "title": "情境导入",
                    "durationMinutes": 10,
                    "teacherActivities": ["展示生活中的重复任务"],
                    "learnerActivities": ["观察并描述重复行为"],
                    "assessment": "检查学员能否识别重复步骤",
                },
                {
                    "stageId": "ST02",
                    "title": "任务实践",
                    "durationMinutes": 35,
                    "teacherActivities": ["组织循环任务"],
                    "learnerActivities": ["完成循环体验活动"],
                    "assessment": "检查任务完成结果",
                },
            ],
            "assessment": "完成课堂循环识别任务",
            "differentiation": ["为零基础学员提供步骤提示"],
            "extension": "寻找更多生活中的循环案例",
            "assumptions": [],
            "qualityChecklist": ["目标与活动一致"],
        },
    }


def make_slide_outline() -> dict[str, Any]:
    return {
        "resourceType": "slide_outline",
        "moduleId": "M01",
        "lessonId": "L001",
        "title": "认识重复任务 PPT课件内容结构",
        "content": {
            "overview": "使用六页幻灯片介绍循环概念。",
            "slides": [
                {
                    "slideId": f"S{number:02d}",
                    "title": f"幻灯片 {number}",
                    "purpose": "推进课堂讲解",
                    "keyPoints": ["循环概念"],
                    "visualSuggestion": "使用简单流程图",
                    "speakerNotes": "结合生活案例进行简短讲解",
                }
                for number in range(1, 7)
            ],
            "assumptions": [],
            "qualityChecklist": ["每页目标清晰"],
        },
    }


def post_with_provider(monkeypatch: Any, provider: FakeProvider, payload: dict[str, Any]):
    monkeypatch.setattr(
        "backend.routers.resource_generation.create_llm_provider",
        lambda settings: provider,
    )
    return TestClient(app).post("/api/v1/resources/generate", json=payload)


def test_generates_lesson_plan_with_mock_llm(monkeypatch: Any) -> None:
    provider = FakeProvider([json.dumps(make_lesson_plan(), ensure_ascii=False)])

    response = post_with_provider(monkeypatch, provider, make_request())

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "succeeded"
    assert payload["resource"]["resourceType"] == "lesson_plan"
    assert payload["resource"]["lessonId"] == "L001"
    assert payload["generation"]["provider"] == "test-provider"
    assert payload["generation"]["model"] == "test-model-v1"
    assert payload["generation"]["promptVersion"] == PROMPT_VERSION
    assert payload["generation"]["usage"]["totalTokens"] == 300
    assert provider.requests[0].max_output_tokens == 4500
    assert "Markdown" in SYSTEM_PROMPT
    assert "PPT、Word、Excel" in SYSTEM_PROMPT


def test_generates_slide_outline_with_mock_llm(monkeypatch: Any) -> None:
    provider = FakeProvider([json.dumps(make_slide_outline(), ensure_ascii=False)])

    response = post_with_provider(
        monkeypatch,
        provider,
        make_request("slide_outline"),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["resource"]["resourceType"] == "slide_outline"
    assert len(payload["resource"]["content"]["slides"]) == 6
    assert provider.requests[0].max_output_tokens == 4000
    assert "RESOURCE_TYPE: slide_outline" in provider.requests[0].user_prompt


def test_rejects_invalid_resource_type() -> None:
    response = TestClient(app).post(
        "/api/v1/resources/generate",
        json=make_request("teacher_script"),
    )

    assert response.status_code == 422


def test_rejects_invalid_lesson_id() -> None:
    payload = make_request()
    payload["lessonId"] = "lesson-1"

    response = TestClient(app).post("/api/v1/resources/generate", json=payload)

    assert response.status_code == 422


def test_rejects_unknown_lesson_id() -> None:
    payload = make_request()
    payload["lessonId"] = "L002"

    response = TestClient(app).post("/api/v1/resources/generate", json=payload)

    assert response.status_code == 422


def test_rejects_invalid_course_project_id() -> None:
    payload = make_request()
    payload["courseProjectId"] = "not-a-uuid"

    response = TestClient(app).post("/api/v1/resources/generate", json=payload)

    assert response.status_code == 422


def test_maps_llm_failure_to_provider_independent_error(monkeypatch: Any) -> None:
    provider = FakeProvider([LLMRateLimitError("raw provider failure")])

    response = post_with_provider(monkeypatch, provider, make_request())

    assert response.status_code == 429
    assert response.json()["error"]["code"] == "LLM_RATE_LIMITED"
    assert "raw provider failure" not in response.text


def test_rejects_invalid_json_after_one_retry(monkeypatch: Any) -> None:
    provider = FakeProvider(["not-json", "still-not-json"])

    response = post_with_provider(monkeypatch, provider, make_request())

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "LLM_INVALID_OUTPUT"
    assert len(provider.requests) == 2
    assert "格式修复重试" in provider.requests[1].user_prompt
    assert "still-not-json" not in response.text


def test_rejects_schema_invalid_output_after_one_retry(monkeypatch: Any) -> None:
    provider = FakeProvider(["{}", "{}"])

    response = post_with_provider(monkeypatch, provider, make_request("slide_outline"))

    assert response.status_code == 502
    assert response.json()["error"]["message"] == "AI 返回的课程资源未通过结构校验，请重试。"
    assert len(provider.requests) == 2


def test_error_response_does_not_expose_secrets_or_prompt(monkeypatch: Any) -> None:
    secret = "sk-secret-key RAW_SYSTEM_PROMPT"
    provider = FakeProvider([LLMAuthenticationError(secret)])

    response = post_with_provider(monkeypatch, provider, make_request())

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "LLM_AUTHENTICATION_FAILED"
    assert secret not in response.text
    assert "RESOURCE_CONTEXT" not in response.text
