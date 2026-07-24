import json
import logging
from datetime import UTC, datetime

from pydantic import ValidationError

from backend.config import Settings
from backend.models.resource_generation import (
    GeneratedLessonPlanResource,
    GeneratedResource,
    GeneratedSlideOutlineResource,
    ResourceGenerateRequest,
    ResourceGenerateResponse,
    ResourceGenerationMetadata,
)
from backend.models.course_generation import TokenUsage
from backend.prompts.resource_generation import (
    PROMPT_VERSION,
    build_structured_output_request,
)
from backend.services.llm.base import (
    LLMInvalidResponseError,
    LLMProvider,
    LLMUsage,
    StructuredOutputResult,
)
from backend.services.resource_context import (
    ResourceConsistencyError,
    build_resource_context,
    validate_resource_consistency,
)


class ResourceGenerationInvalidOutputError(Exception):
    pass


logger = logging.getLogger(__name__)


class ResourceGenerationService:
    def __init__(self, provider: LLMProvider, settings: Settings) -> None:
        self._provider = provider
        self._settings = settings

    async def generate(
        self,
        request: ResourceGenerateRequest,
        request_id: str,
    ) -> ResourceGenerateResponse:
        total_usage = LLMUsage()
        final_result: StructuredOutputResult | None = None
        resource: GeneratedResource | None = None
        attempts = 0
        retry_failure_type: str | None = None

        for attempt in range(1, 3):
            llm_request = build_structured_output_request(
                request=request,
                request_id=request_id,
                configured_token_limit=self._settings.llm_max_output_tokens,
                temperature=self._settings.llm_temperature,
                retry=attempt == 2,
                retry_failure_type=retry_failure_type,
            )
            try:
                result = await self._provider.generate_structured_output(llm_request)
            except LLMInvalidResponseError as exc:
                _log_validation_failure(
                    request_id=request_id,
                    resource_type=request.resource_type,
                    failure_type="provider response invalid",
                    field="response",
                    attempt=attempt,
                )
                if attempt == 1:
                    continue
                raise ResourceGenerationInvalidOutputError from exc

            total_usage += result.usage
            try:
                resource = self._parse_and_validate(result, request)
            except (
                ValueError,
                ValidationError,
                json.JSONDecodeError,
            ) as exc:
                failure_type, failure_field = _validation_failure_details(exc)
                _log_validation_failure(
                    request_id=request_id,
                    resource_type=request.resource_type,
                    failure_type=failure_type,
                    field=failure_field,
                    attempt=attempt,
                )
                retry_failure_type = f"{failure_type}; field={failure_field}"
                if attempt == 1:
                    continue
                raise ResourceGenerationInvalidOutputError from exc
            final_result = result
            attempts = attempt
            break
        else:  # pragma: no cover - loop always returns or raises
            raise ResourceGenerationInvalidOutputError

        if final_result is None or resource is None:  # pragma: no cover
            raise ResourceGenerationInvalidOutputError

        estimated_cost = self._estimate_cost(total_usage)
        return ResourceGenerateResponse(
            request_id=request_id,
            course_project_id=request.course_project_id,
            resource=resource,
            generation=ResourceGenerationMetadata(
                provider=final_result.provider,
                model=final_result.model,
                prompt_version=PROMPT_VERSION,
                attempts=attempts,
                generated_at=datetime.now(UTC),
                usage=TokenUsage(
                    prompt_tokens=total_usage.prompt_tokens,
                    prompt_cache_hit_tokens=total_usage.prompt_cache_hit_tokens,
                    prompt_cache_miss_tokens=total_usage.prompt_cache_miss_tokens,
                    completion_tokens=total_usage.completion_tokens,
                    total_tokens=total_usage.total_tokens,
                    estimated_cost_usd=estimated_cost,
                    pricing_snapshot=(
                        self._settings.llm_pricing_snapshot
                        if estimated_cost is not None
                        else None
                    ),
                ),
            ),
        )

    def _parse_and_validate(
        self,
        result: StructuredOutputResult,
        request: ResourceGenerateRequest,
    ) -> GeneratedResource:
        if result.finish_reason == "length":
            raise ValueError("LLM output was truncated")
        if len(result.content.encode("utf-8")) > self._settings.max_generated_json_bytes:
            raise ValueError("LLM output exceeded the configured byte limit")

        payload = json.loads(result.content)
        model = (
            GeneratedLessonPlanResource
            if request.resource_type == "lesson_plan"
            else GeneratedSlideOutlineResource
        )
        resource = model.model_validate(payload)
        lesson = next(
            item
            for item in request.course_plan.lesson_index
            if item.lesson_id == request.lesson_id
        )
        if resource.lesson_id != request.lesson_id or resource.module_id != lesson.module_id:
            raise ValueError("Generated resource target does not match the request")

        if isinstance(resource, GeneratedLessonPlanResource):
            total_minutes = sum(
                stage.duration_minutes for stage in resource.content.stages
            )
            if total_minutes != lesson.duration_minutes:
                raise ValueError("Lesson plan stage durations must match lesson duration")
            stage_ids = [stage.stage_id for stage in resource.content.stages]
            expected_stage_ids = [
                f"ST{number:02d}" for number in range(1, len(stage_ids) + 1)
            ]
            if stage_ids != expected_stage_ids:
                raise ValueError("Lesson plan stage IDs must be sequential")
        else:
            slide_ids = [slide.slide_id for slide in resource.content.slides]
            expected_slide_ids = [
                f"S{number:02d}" for number in range(1, len(slide_ids) + 1)
            ]
            if slide_ids != expected_slide_ids:
                raise ValueError("Slide IDs must be sequential")
        validate_resource_consistency(resource, build_resource_context(request))
        return resource

    def _estimate_cost(self, usage: LLMUsage) -> float | None:
        input_price = self._settings.llm_input_cost_per_1m
        output_price = self._settings.llm_output_cost_per_1m
        if input_price is None or output_price is None:
            return None
        cache_price = self._settings.llm_cache_hit_input_cost_per_1m
        cache_price = input_price if cache_price is None else cache_price
        miss_tokens = usage.prompt_cache_miss_tokens
        if miss_tokens == 0 and usage.prompt_tokens > usage.prompt_cache_hit_tokens:
            miss_tokens = usage.prompt_tokens - usage.prompt_cache_hit_tokens
        cost = (
            usage.prompt_cache_hit_tokens * cache_price
            + miss_tokens * input_price
            + usage.completion_tokens * output_price
        ) / 1_000_000
        return round(cost, 8)


def _validation_failure_details(exc: Exception) -> tuple[str, str]:
    if isinstance(exc, ResourceConsistencyError):
        return exc.failure_type, exc.field
    if isinstance(exc, json.JSONDecodeError):
        return "schema mismatch", "response.json"
    if isinstance(exc, ValidationError):
        errors = exc.errors(include_input=False)
        location = errors[0].get("loc", ()) if errors else ()
        field = ".".join(str(part) for part in location) or "response.schema"
        return "schema mismatch", field

    message_to_field = {
        "LLM output was truncated": "response",
        "LLM output exceeded the configured byte limit": "response",
        "Generated resource target does not match the request": "resource.target",
        "Lesson plan stage durations must match lesson duration": (
            "content.stages.durationMinutes"
        ),
        "Lesson plan stage IDs must be sequential": "content.stages.stageId",
        "Slide IDs must be sequential": "content.slides.slideId",
    }
    return "schema mismatch", message_to_field.get(str(exc), "resource")


def _log_validation_failure(
    *,
    request_id: str,
    resource_type: str,
    failure_type: str,
    field: str,
    attempt: int,
) -> None:
    logger.warning(
        "resource_generation_validation_failed "
        "request_id=%s resource_type=%s failure_type=%s field=%s attempt=%s",
        request_id,
        resource_type,
        failure_type,
        field,
        attempt,
    )
