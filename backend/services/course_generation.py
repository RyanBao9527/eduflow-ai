import json
import re
from datetime import UTC, datetime

from pydantic import ValidationError

from backend.config import Settings
from backend.models.course_generation import (
    ApiError,
    BalancedCoursePlan,
    CourseBrief,
    CoursePlanGenerateResponse,
    DetailedCoursePlan,
    ErrorResponse,
    GenerationMetadata,
    TokenUsage,
)
from backend.prompts.course_blueprint import (
    PROMPT_VERSION,
    build_structured_output_request,
    key_lesson_count,
    select_detail_mode,
)
from backend.services.llm.base import (
    LLMInvalidResponseError,
    LLMProvider,
    LLMUsage,
    StructuredOutputResult,
)


class CourseGenerationInvalidOutputError(Exception):
    pass


class CourseGenerationService:
    def __init__(self, provider: LLMProvider, settings: Settings) -> None:
        self._provider = provider
        self._settings = settings

    async def generate(
        self,
        brief: CourseBrief,
        request_id: str,
    ) -> CoursePlanGenerateResponse:
        detail_mode = select_detail_mode(brief.lesson_count)
        total_usage = LLMUsage()
        final_result: StructuredOutputResult | None = None
        plan: DetailedCoursePlan | BalancedCoursePlan | None = None

        for attempt in range(1, 3):
            llm_request = build_structured_output_request(
                brief=brief,
                request_id=request_id,
                configured_token_limit=self._settings.llm_max_output_tokens,
                temperature=self._settings.llm_temperature,
                retry=attempt == 2,
            )
            try:
                result = await self._provider.generate_structured_output(llm_request)
            except LLMInvalidResponseError as exc:
                if attempt == 1:
                    continue
                raise CourseGenerationInvalidOutputError from exc

            total_usage += result.usage
            try:
                plan = self._parse_and_validate(result, brief, detail_mode)
            except (ValueError, ValidationError, json.JSONDecodeError) as exc:
                if attempt == 1:
                    continue
                raise CourseGenerationInvalidOutputError from exc
            final_result = result
            attempts = attempt
            break
        else:  # pragma: no cover - loop always returns or raises
            raise CourseGenerationInvalidOutputError

        if final_result is None or plan is None:  # pragma: no cover - defensive guard
            raise CourseGenerationInvalidOutputError

        usage = TokenUsage(
            prompt_tokens=total_usage.prompt_tokens,
            prompt_cache_hit_tokens=total_usage.prompt_cache_hit_tokens,
            prompt_cache_miss_tokens=total_usage.prompt_cache_miss_tokens,
            completion_tokens=total_usage.completion_tokens,
            total_tokens=total_usage.total_tokens,
            estimated_cost_usd=self._estimate_cost(total_usage),
            pricing_snapshot=(
                self._settings.llm_pricing_snapshot
                if self._estimate_cost(total_usage) is not None
                else None
            ),
        )
        return CoursePlanGenerateResponse(
            request_id=request_id,
            course_plan=plan,
            generation=GenerationMetadata(
                provider=final_result.provider,
                model=final_result.model,
                detail_mode=detail_mode,
                prompt_version=PROMPT_VERSION,
                attempts=attempts,
                generated_at=datetime.now(UTC),
                usage=usage,
            ),
        )

    def _parse_and_validate(
        self,
        result: StructuredOutputResult,
        brief: CourseBrief,
        detail_mode: str,
    ) -> DetailedCoursePlan | BalancedCoursePlan:
        if result.finish_reason == "length":
            raise ValueError("LLM output was truncated")
        if len(result.content.encode("utf-8")) > self._settings.max_generated_json_bytes:
            raise ValueError("LLM output exceeded the configured byte limit")

        payload = json.loads(result.content)
        model = DetailedCoursePlan if detail_mode == "detailed" else BalancedCoursePlan
        plan = model.model_validate(payload)
        self._validate_structure(plan, brief)

        corrected_lessons = [
            lesson.model_copy(
                update={"duration_minutes": brief.lesson_duration_minutes}
            )
            for lesson in plan.lesson_index
        ]
        return plan.model_copy(
            update={"title": brief.course_title, "lesson_index": corrected_lessons}
        )

    @staticmethod
    def _validate_structure(
        plan: DetailedCoursePlan | BalancedCoursePlan,
        brief: CourseBrief,
    ) -> None:
        expected_lesson_ids = [f"L{number:03d}" for number in range(1, brief.lesson_count + 1)]
        actual_lesson_ids = [lesson.lesson_id for lesson in plan.lesson_index]
        actual_numbers = [lesson.lesson_number for lesson in plan.lesson_index]
        if actual_lesson_ids != expected_lesson_ids:
            raise ValueError("Lesson IDs must be unique and sequential")
        if actual_numbers != list(range(1, brief.lesson_count + 1)):
            raise ValueError("Lesson numbers must be sequential")

        module_ids = [module.module_id for module in plan.modules]
        expected_module_ids = [f"M{number:02d}" for number in range(1, len(plan.modules) + 1)]
        if module_ids != expected_module_ids:
            raise ValueError("Module IDs must be unique and sequential")

        module_lessons = [
            lesson_id for module in plan.modules for lesson_id in module.lesson_ids
        ]
        if sorted(module_lessons) != sorted(expected_lesson_ids) or len(
            module_lessons
        ) != len(set(module_lessons)):
            raise ValueError("Modules must partition all lessons")
        lesson_to_module = {
            lesson_id: module.module_id
            for module in plan.modules
            for lesson_id in module.lesson_ids
        }
        if any(
            lesson_to_module.get(lesson.lesson_id) != lesson.module_id
            for lesson in plan.lesson_index
        ):
            raise ValueError("Lesson module references are inconsistent")

        signatures = [
            (_normalize(lesson.title), _normalize(lesson.objective))
            for lesson in plan.lesson_index
        ]
        if len(signatures) != len(set(signatures)):
            raise ValueError("Duplicate lessons are not allowed")

        if isinstance(plan, DetailedCoursePlan):
            detail_ids = [detail.lesson_id for detail in plan.lesson_details]
            if detail_ids != expected_lesson_ids:
                raise ValueError("Detailed mode must describe every lesson")
        else:
            expected_key_count = key_lesson_count(brief.lesson_count)
            key_ids = [detail.lesson_id for detail in plan.key_lesson_details]
            if len(key_ids) != expected_key_count or len(key_ids) != len(set(key_ids)):
                raise ValueError("Balanced mode has an invalid key lesson set")
            if not set(key_ids).issubset(expected_lesson_ids):
                raise ValueError("Balanced mode references an unknown lesson")

            phase_ids = [phase.phase_id for phase in plan.phases]
            expected_phase_ids = [f"P{number:02d}" for number in range(1, len(plan.phases) + 1)]
            if phase_ids != expected_phase_ids:
                raise ValueError("Phase IDs must be unique and sequential")
            phase_lessons = [
                lesson_id for phase in plan.phases for lesson_id in phase.lesson_ids
            ]
            phase_modules = [
                module_id for phase in plan.phases for module_id in phase.module_ids
            ]
            if sorted(phase_lessons) != sorted(expected_lesson_ids) or len(
                phase_lessons
            ) != len(set(phase_lessons)):
                raise ValueError("Phases must partition all lessons")
            if sorted(phase_modules) != sorted(module_ids) or len(phase_modules) != len(
                set(phase_modules)
            ):
                raise ValueError("Phases must partition all modules")
            if any(not set(phase.lesson_ids).intersection(key_ids) for phase in plan.phases):
                raise ValueError("Every phase must include a key lesson")

        resource_types = [item.resource_type for item in plan.resource_plan]
        if set(resource_types) != set(brief.requested_resources) or len(
            resource_types
        ) != len(set(resource_types)):
            raise ValueError("Resource plan must match requested resources")
        for item in plan.resource_plan:
            if not item.module_ids and not item.lesson_ids:
                raise ValueError("Every resource plan item needs a scope")
            if not set(item.module_ids).issubset(module_ids):
                raise ValueError("Resource plan references an unknown module")
            if not set(item.lesson_ids).issubset(expected_lesson_ids):
                raise ValueError("Resource plan references an unknown lesson")

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


def error_response(
    code: str,
    message: str,
    retryable: bool,
    request_id: str,
) -> ErrorResponse:
    return ErrorResponse(
        error=ApiError(
            code=code,
            message=message,
            retryable=retryable,
            request_id=request_id,
        )
    )


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().casefold())
