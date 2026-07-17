from uuid import uuid4

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from backend.config import Settings, get_settings
from backend.models.course_generation import ApiError, ErrorResponse
from backend.models.resource_generation import (
    ResourceGenerateRequest,
    ResourceGenerateResponse,
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
from backend.services.resource_generation import (
    ResourceGenerationInvalidOutputError,
    ResourceGenerationService,
)

router = APIRouter(prefix="/api/v1/resources", tags=["resource-generation"])


@router.post(
    "/generate",
    response_model=ResourceGenerateResponse,
    responses={
        429: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
        504: {"model": ErrorResponse},
    },
)
async def generate_resource(
    request: ResourceGenerateRequest,
    settings: Settings = Depends(get_settings),
) -> ResourceGenerateResponse | JSONResponse:
    request_id = str(uuid4())
    try:
        provider = create_llm_provider(settings)
        service = ResourceGenerationService(provider, settings)
        return await service.generate(request, request_id)
    except LLMConfigurationError as exc:
        return _json_error(503, exc.code, "AI 服务尚未完成配置。", False, request_id)
    except (LLMAuthenticationError, LLMBalanceError) as exc:
        return _json_error(
            503,
            exc.code,
            "AI 服务当前不可用，请检查服务配置。",
            False,
            request_id,
        )
    except LLMRateLimitError as exc:
        return _json_error(429, exc.code, "AI 服务繁忙，请稍后重试。", True, request_id)
    except LLMTimeoutError as exc:
        return _json_error(504, exc.code, "课程资源生成超时，请重试。", True, request_id)
    except LLMServiceUnavailableError as exc:
        return _json_error(
            503,
            exc.code,
            "AI 服务暂时不可用，请稍后重试。",
            True,
            request_id,
        )
    except ResourceGenerationInvalidOutputError:
        return _json_error(
            502,
            "LLM_INVALID_OUTPUT",
            "AI 返回的课程资源未通过结构校验，请重试。",
            True,
            request_id,
        )
    except LLMProviderError as exc:
        return _json_error(
            502,
            exc.code,
            "AI 服务返回了无效响应。",
            exc.retryable,
            request_id,
        )


def _json_error(
    status_code: int,
    code: str,
    message: str,
    retryable: bool,
    request_id: str,
) -> JSONResponse:
    payload = ErrorResponse(
        error=ApiError(
            code=code,
            message=message,
            retryable=retryable,
            request_id=request_id,
        )
    )
    return JSONResponse(
        status_code=status_code,
        content=payload.model_dump(mode="json", by_alias=True),
    )
