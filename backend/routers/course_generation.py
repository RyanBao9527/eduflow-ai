from uuid import uuid4

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from backend.config import Settings, get_settings
from backend.models.course_generation import (
    CoursePlanGenerateRequest,
    CoursePlanGenerateResponse,
    ErrorResponse,
)
from backend.services.course_generation import (
    CourseGenerationInvalidOutputError,
    CourseGenerationService,
    error_response,
)
from backend.services.llm import create_llm_provider
from backend.services.llm.base import (
    LLMAuthenticationError,
    LLMBalanceError,
    LLMConfigurationError,
    LLMProviderError,
    LLMRateLimitError,
    LLMServiceUnavailableError,
    LLMTimeoutError,
)

router = APIRouter(prefix="/api/v1/course-plans", tags=["course-generation"])


@router.post(
    "/generate",
    response_model=CoursePlanGenerateResponse,
    responses={
        429: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
        504: {"model": ErrorResponse},
    },
)
async def generate_course_plan(
    request: CoursePlanGenerateRequest,
    settings: Settings = Depends(get_settings),
) -> CoursePlanGenerateResponse | JSONResponse:
    request_id = str(uuid4())
    try:
        provider = create_llm_provider(settings)
        service = CourseGenerationService(provider, settings)
        return await service.generate(request.course_brief, request_id)
    except LLMConfigurationError as exc:
        return _json_error(503, exc.code, "AI 服务尚未完成配置。", False, request_id)
    except (LLMAuthenticationError, LLMBalanceError) as exc:
        return _json_error(503, exc.code, "AI 服务当前不可用，请检查服务配置。", False, request_id)
    except LLMRateLimitError as exc:
        return _json_error(429, exc.code, "AI 服务繁忙，请稍后重试。", True, request_id)
    except LLMTimeoutError as exc:
        return _json_error(504, exc.code, "课程蓝图生成超时，请重试。", True, request_id)
    except LLMServiceUnavailableError as exc:
        return _json_error(503, exc.code, "AI 服务暂时不可用，请稍后重试。", True, request_id)
    except CourseGenerationInvalidOutputError:
        return _json_error(
            502,
            "LLM_INVALID_OUTPUT",
            "AI 返回的课程蓝图未通过结构校验，请重试。",
            True,
            request_id,
        )
    except LLMProviderError as exc:
        return _json_error(502, exc.code, "AI 服务返回了无效响应。", exc.retryable, request_id)


def _json_error(
    status_code: int,
    code: str,
    message: str,
    retryable: bool,
    request_id: str,
) -> JSONResponse:
    payload = error_response(code, message, retryable, request_id)
    return JSONResponse(
        status_code=status_code,
        content=payload.model_dump(mode="json", by_alias=True),
    )
