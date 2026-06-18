from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from dotenv import dotenv_values

LOGGER = logging.getLogger(__name__)
PROMPT_PREVIEW_CHARS = 1200
RESPONSE_PREVIEW_CHARS = 1200


@dataclass
class LangfuseAIGenerationTracer:
    metadata: dict[str, Any]
    messages: list[dict[str, str]]
    llm_provider: str | None
    llm_model: str | None
    user_id: int | None = None
    warnings: list[str] = field(default_factory=list)
    trace_id: str | None = None
    trace_url: str | None = None
    _client: Any = None
    _trace: Any = None
    _generation: Any = None

    def start(self) -> None:
        if not _enabled():
            return

        public_key = _env("LANGFUSE_PUBLIC_KEY")
        secret_key = _env("LANGFUSE_SECRET_KEY")
        host = _env("LANGFUSE_HOST")
        if not public_key or not secret_key:
            self._warn("Langfuse tracing disabled: missing LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY")
            return

        try:
            from langfuse import Langfuse

            self._client = Langfuse(
                public_key=public_key,
                secret_key=secret_key,
                host=host,
                environment=_env("LANGFUSE_ENV") or "development",
            )
            trace_input = _trace_input(self.metadata)
            self._trace = self._client.start_observation(
                name="ai_question_generation",
                as_type="span",
                input=trace_input,
                metadata=self.metadata,
            )
            if self.user_id is not None:
                self._trace.update(metadata={**self.metadata, "user_id": self.user_id})
            self.trace_id = getattr(self._trace, "trace_id", None)
            if self.trace_id:
                self.trace_url = self._client.get_trace_url(trace_id=self.trace_id)
            self._generation = self._trace.start_observation(
                name="llm_generate_questions",
                as_type="generation",
                model=self.llm_model,
                input=_prompt_input(self.messages),
                metadata={
                    "llm_provider": self.llm_provider,
                    "llm_model": self.llm_model,
                    "prompt_logging": "full" if _log_full_prompt() else "preview",
                },
            )
        except Exception as exc:
            self._warn(f"Langfuse tracing start failed: {exc.__class__.__name__}")

    def end_success(
        self,
        *,
        output: str,
        usage: dict[str, int | None],
        latency_ms: int,
        generated_question_count: int,
        saved_question_count: int,
    ) -> None:
        self._finish(
            status="success",
            output=output,
            usage=usage,
            latency_ms=latency_ms,
            generated_question_count=generated_question_count,
            saved_question_count=saved_question_count,
            parse_status="success",
            error=None,
        )

    def end_failed(
        self,
        *,
        error_type: str,
        error_message: str,
        latency_ms: int | None,
        parse_status: str,
        output: str | None = None,
        usage: dict[str, int | None] | None = None,
    ) -> None:
        self._finish(
            status="failed",
            output=output,
            usage=usage or {},
            latency_ms=latency_ms,
            generated_question_count=0,
            saved_question_count=0,
            parse_status=parse_status,
            error={"type": error_type, "message": _sanitize_error(error_message)},
        )

    def flush(self) -> None:
        if self._client is None:
            return
        try:
            self._client.flush()
        except Exception as exc:
            self._warn(f"Langfuse flush failed: {exc.__class__.__name__}")

    def _finish(
        self,
        *,
        status: str,
        output: str | None,
        usage: dict[str, int | None],
        latency_ms: int | None,
        generated_question_count: int,
        saved_question_count: int,
        parse_status: str,
        error: dict[str, str] | None,
    ) -> None:
        if self._trace is None:
            return
        final_metadata = {
            **self.metadata,
            "status": status,
            "latency_ms": latency_ms,
            "input_tokens": usage.get("input_tokens"),
            "output_tokens": usage.get("output_tokens"),
            "total_tokens": usage.get("total_tokens"),
            "generated_question_count": generated_question_count,
            "saved_question_count": saved_question_count,
            "parse_status": parse_status,
            "error": error,
        }
        try:
            if self._generation is not None:
                self._generation.update(
                    output=_response_output(output),
                    usage_details=_usage_details(usage),
                    metadata=final_metadata,
                    level="ERROR" if status == "failed" else "DEFAULT",
                    status_message=error["message"] if error else None,
                )
                self._generation.end()
            self._trace.update(
                output={
                    "status": status,
                    "generated_question_count": generated_question_count,
                    "saved_question_count": saved_question_count,
                    "parse_status": parse_status,
                },
                metadata=final_metadata,
                level="ERROR" if status == "failed" else "DEFAULT",
                status_message=error["message"] if error else None,
            )
            self._trace.end()
        except Exception as exc:
            self._warn(f"Langfuse tracing finish failed: {exc.__class__.__name__}")

    def _warn(self, message: str) -> None:
        self.warnings.append(message)
        LOGGER.warning(message)


def _enabled() -> bool:
    return _truthy(_env("LANGFUSE_ENABLED") or "false")


def _log_full_prompt() -> bool:
    return _truthy(_env("LLM_LOG_FULL_PROMPT") or "false")


def _log_response() -> bool:
    configured = _env("LLM_LOG_RESPONSE")
    if configured is not None:
        return _truthy(configured)
    return (_env("LANGFUSE_ENV") or "").lower() == "development"


def _prompt_input(messages: list[dict[str, str]]) -> dict:
    if _log_full_prompt():
        return {"messages": messages, "prompt_logging": "full"}
    compact_prompt = "\n".join(message.get("content", "") for message in messages)
    return {
        "message_count": len(messages),
        "prompt_preview": _preview(compact_prompt, PROMPT_PREVIEW_CHARS),
        "prompt_logging": "preview",
    }


def _response_output(output: str | None) -> dict | None:
    if output is None:
        return None
    if _log_response():
        return {"content": output, "response_logging": "full"}
    return {
        "response_preview": _preview(output, RESPONSE_PREVIEW_CHARS),
        "response_logging": "preview",
    }


def _trace_input(metadata: dict[str, Any]) -> dict[str, Any]:
    return {
        "document_id": metadata.get("document_id"),
        "learning_outcome_id": metadata.get("learning_outcome_id"),
        "topic": metadata.get("topic"),
        "question_type": metadata.get("question_type"),
        "difficulty": metadata.get("difficulty"),
        "num_questions": metadata.get("num_questions"),
        "top_k": metadata.get("top_k"),
        "source_chunk_ids": metadata.get("source_chunk_ids"),
    }


def _usage_details(usage: dict[str, int | None]) -> dict[str, int]:
    details = {}
    if usage.get("input_tokens") is not None:
        details["input"] = int(usage["input_tokens"])
    if usage.get("output_tokens") is not None:
        details["output"] = int(usage["output_tokens"])
    if usage.get("total_tokens") is not None:
        details["total"] = int(usage["total_tokens"])
    return details


def _preview(text: str, limit: int) -> str:
    compact = " ".join(text.split())
    if len(compact) <= limit:
        return compact
    return f"{compact[:limit].rstrip()}..."


def _truthy(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env(name: str) -> str | None:
    value = os.getenv(name) or _dotenv_values().get(name)
    return value.strip() if value else None


def _dotenv_values() -> dict[str, str | None]:
    env_path = Path(".env")
    if not env_path.exists():
        return {}
    return dict(dotenv_values(env_path))


def _sanitize_error(message: str) -> str:
    sanitized = message.replace("\n", " ").strip()
    return _preview(sanitized, 500)
