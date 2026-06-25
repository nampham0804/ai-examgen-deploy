from __future__ import annotations

from time import perf_counter

from sqlalchemy.orm import Session

from src.ai.parsers.question_parser import QuestionParseError, parse_questions_with_warnings
from src.ai.prompts.question_generation import build_question_generation_messages
from src.ai.providers.llm_provider import (
    LLMProviderError,
    chat_completion_with_metadata,
    get_llm_provider_metadata,
)
from src.models.document_chunk import DocumentChunk
from src.observability.langfuse_tracer import LangfuseAIGenerationTracer
from src.repositories.document_chunk_repository import list_document_chunks
from src.repositories.document_repository import get_document
from src.repositories.learning_outcome_repository import get_learning_outcome
from src.repositories.question_repository import (
    create_questions,
    list_questions_for_quality_check_by_document_ids,
    list_recent_question_texts_for_prompt,
)
from src.services.question_quality_service import validate_generated_questions
from src.services.retrieval_service import DEFAULT_TOP_K, MAX_TOP_K, RetrievalError, retrieve_relevant_chunks

MAX_NUM_QUESTIONS = 20


class AIGenerationError(Exception):
    def __init__(self, detail: str, status_code: int = 400, error: str = "AI generation failed") -> None:
        self.detail = detail
        self.status_code = status_code
        self.error = error


class QuestionValidationError(Exception):
    def __init__(self, detail: str, warnings: list[str]) -> None:
        self.detail = detail
        self.warnings = warnings
        self.error = "Question validation failed"
        self.status_code = 502


def generate_questions_from_chunks(
    db: Session,
    *,
    document_id: int | None = None,
    document_ids: list[int] | None = None,
    learning_outcome_id: int,
    question_type: str,
    difficulty: str,
    num_questions: int,
    topic: str | None = None,
    top_k: int = DEFAULT_TOP_K,
    diversity_mode: bool = True,
) -> dict:
    _validate_generation_request(question_type, difficulty)
    requested_count = min(max(num_questions, 1), MAX_NUM_QUESTIONS)
    requested_top_k = min(max(top_k, 1), MAX_TOP_K)
    selected_document_ids = _normalize_document_ids(document_id, document_ids)
    primary_document_id = selected_document_ids[0]

    learning_outcome = get_learning_outcome(db, learning_outcome_id)
    if learning_outcome is None:
        raise AIGenerationError("Learning outcome not found", status_code=404, error="Not found")

    documents = _get_generation_documents(db, selected_document_ids, learning_outcome.course_id)
    primary_document = documents[0]
    retrieval = _retrieve_chunks_for_documents(
        db,
        document_ids=selected_document_ids,
        learning_outcome_id=learning_outcome_id,
        topic=topic,
        top_k=requested_top_k,
    )

    selected_chunk_ids = [chunk["chunk_id"] for chunk in retrieval["chunks"]]
    chunks = _chunks_by_ids(_list_chunks_for_documents(db, selected_document_ids), selected_chunk_ids)
    if not chunks:
        raise AIGenerationError("No selected chunks were available for question generation")

    existing_question_texts = list_recent_question_texts_for_prompt(
        db,
        course_id=primary_document.course_id,
        document_ids=selected_document_ids,
        limit=20,
    )
    messages = build_question_generation_messages(
        course=primary_document.course,
        learning_outcome=learning_outcome,
        chunks=chunks,
        question_type=question_type,
        difficulty=difficulty,
        num_questions=requested_count,
        topic=topic,
        diversity_mode=diversity_mode,
        existing_question_texts=existing_question_texts,
    )

    provider_metadata = get_llm_provider_metadata()
    trace_metadata = {
        "document_id": primary_document_id,
        "document_ids": selected_document_ids,
        "learning_outcome_id": learning_outcome_id,
        "course_id": primary_document.course_id,
        "topic": topic,
        "question_type": question_type,
        "difficulty": difficulty,
        "num_questions": requested_count,
        "top_k": requested_top_k,
        "source_chunk_ids": selected_chunk_ids,
        "llm_provider": provider_metadata.provider,
        "llm_model": provider_metadata.model,
        "llm_temperature": provider_metadata.temperature,
        "user_id": primary_document.uploaded_by,
    }
    tracer = LangfuseAIGenerationTracer(
        metadata=trace_metadata,
        messages=messages,
        llm_provider=provider_metadata.provider,
        llm_model=provider_metadata.model,
        user_id=primary_document.uploaded_by,
    )
    tracer.start()

    started_at = perf_counter()
    llm_response = None
    parse_warnings: list[str] = []
    quality_warnings: list[str] = []
    validation_rejected_count = 0
    try:
        llm_response = chat_completion_with_metadata(messages=messages)
        tracer.metadata["llm_provider"] = llm_response.provider
        tracer.metadata["llm_model"] = llm_response.model
        tracer.llm_provider = llm_response.provider
        tracer.llm_model = llm_response.model
        latency_ms = _latency_ms(started_at)
        parsed_batch = parse_questions_with_warnings(
            llm_response.content,
            question_type=question_type,
            selected_chunk_ids=selected_chunk_ids,
            max_questions=requested_count,
        )
        parse_warnings = parsed_batch.warnings
        existing_questions = list_questions_for_quality_check_by_document_ids(
            db,
            course_id=primary_document.course_id,
            document_ids=selected_document_ids,
        )
        quality_result = validate_generated_questions(
            parsed_batch.questions,
            question_type=question_type,
            selected_chunk_ids=selected_chunk_ids,
            existing_questions=existing_questions,
        )
        quality_warnings = quality_result.warnings
        validation_rejected_count = quality_result.rejected_count
        parsed_questions = quality_result.valid_questions
        if not parsed_questions:
            raise QuestionValidationError(
                "No generated questions passed quality validation",
                warnings=[*parse_warnings, *quality_warnings],
            )
    except LLMProviderError as exc:
        tracer.end_failed(
            error_type=exc.error,
            error_message=exc.detail,
            latency_ms=_latency_ms(started_at),
            parse_status="not_started",
            output=llm_response.content if llm_response else None,
            usage=_usage(llm_response),
        )
        tracer.flush()
        raise AIGenerationError(exc.detail, status_code=exc.status_code, error=exc.error) from exc
    except QuestionParseError as exc:
        tracer.end_failed(
            error_type=exc.error,
            error_message=exc.detail,
            latency_ms=_latency_ms(started_at),
            parse_status="failed",
            output=llm_response.content if llm_response else None,
            usage=_usage(llm_response),
        )
        tracer.flush()
        raise AIGenerationError(exc.detail, status_code=exc.status_code, error=exc.error) from exc
    except QuestionValidationError as exc:
        tracer.metadata["validation_status"] = "failed"
        tracer.metadata["validation_rejected_count"] = validation_rejected_count
        tracer.metadata["validation_warnings"] = exc.warnings
        tracer.end_failed(
            error_type=exc.error,
            error_message=f"{exc.detail}: {'; '.join(exc.warnings)}",
            latency_ms=_latency_ms(started_at),
            parse_status="validation_failed",
            output=llm_response.content if llm_response else None,
            usage=_usage(llm_response),
        )
        tracer.flush()
        raise AIGenerationError(exc.detail, status_code=exc.status_code, error=exc.error) from exc

    saved_questions = create_questions(
        db,
        [
            {
                **question,
                "course_id": primary_document.course_id,
                "learning_outcome_id": learning_outcome_id,
                "document_id": primary_document_id,
                "question_type": question_type,
                "difficulty": difficulty,
                "status": "pending_review",
                "created_by_ai": True,
                "created_by": None,
                "generation_topic": topic,
            }
            for question in parsed_questions
        ],
    )

    warnings = []
    warnings.extend(parse_warnings)
    warnings.extend(quality_warnings)
    if len(saved_questions) < requested_count:
        warnings.append("LLM returned fewer quality-valid questions than requested")
    tracer.metadata["validation_status"] = "success"
    tracer.metadata["validation_rejected_count"] = validation_rejected_count
    tracer.metadata["validation_warnings"] = warnings
    tracer.end_success(
        output=llm_response.content,
        usage=_usage(llm_response),
        latency_ms=latency_ms,
        generated_question_count=len(parsed_batch.questions),
        saved_question_count=len(saved_questions),
    )
    tracer.flush()
    warnings.extend(tracer.warnings)

    return {
        "generated": len(saved_questions),
        "document_id": primary_document_id,
        "document_ids": selected_document_ids,
        "learning_outcome_id": learning_outcome_id,
        "source_chunk_ids": selected_chunk_ids,
        "warnings": warnings,
        "questions": saved_questions,
    }


def _validate_generation_request(question_type: str, difficulty: str) -> None:
    if question_type not in {"mcq", "essay"}:
        raise AIGenerationError("question_type must be one of: mcq, essay")
    if difficulty not in {"easy", "medium", "hard"}:
        raise AIGenerationError("difficulty must be one of: easy, medium, hard")


def _normalize_document_ids(document_id: int | None, document_ids: list[int] | None) -> list[int]:
    values = document_ids if document_ids is not None else ([document_id] if document_id is not None else [])
    normalized = []
    for value in values:
        if value is None:
            continue
        if value not in normalized:
            normalized.append(value)
    if not normalized:
        raise AIGenerationError("At least one document_id is required")
    return normalized


def _get_generation_documents(db: Session, document_ids: list[int], course_id: int) -> list:
    documents = []
    for selected_document_id in document_ids:
        document = get_document(db, selected_document_id)
        if document is None:
            raise AIGenerationError("Document not found", status_code=404, error="Not found")
        if document.status != "processed":
            raise AIGenerationError("Document must be processed before question generation")
        if document.course_id != course_id:
            raise AIGenerationError("All selected documents must belong to the learning outcome course")
        documents.append(document)
    return documents


def _retrieve_chunks_for_documents(
    db: Session,
    *,
    document_ids: list[int],
    learning_outcome_id: int,
    topic: str | None,
    top_k: int,
) -> dict:
    merged_chunks = []
    for selected_document_id in document_ids:
        try:
            retrieval = retrieve_relevant_chunks(
                db,
                document_id=selected_document_id,
                learning_outcome_id=learning_outcome_id,
                topic=topic,
                top_k=top_k,
            )
        except RetrievalError as exc:
            raise AIGenerationError(exc.detail, status_code=exc.status_code, error=exc.error) from exc
        merged_chunks.extend(retrieval["chunks"])

    if not merged_chunks:
        raise AIGenerationError("No relevant chunks found for the selected documents")

    return {
        "document_ids": document_ids,
        "learning_outcome_id": learning_outcome_id,
        "topic": topic,
        "top_k": top_k,
        "chunks": sorted(merged_chunks, key=lambda chunk: (-chunk["score"], chunk.get("chunk_index", 0))),
    }


def _list_chunks_for_documents(db: Session, document_ids: list[int]) -> list[DocumentChunk]:
    chunks = []
    for selected_document_id in document_ids:
        chunks.extend(list_document_chunks(db, selected_document_id))
    return chunks


def _chunks_by_ids(chunks: list[DocumentChunk], selected_chunk_ids: list[int]) -> list[DocumentChunk]:
    by_id = {chunk.id: chunk for chunk in chunks}
    return [by_id[chunk_id] for chunk_id in selected_chunk_ids if chunk_id in by_id]


def _latency_ms(started_at: float) -> int:
    return int((perf_counter() - started_at) * 1000)


def _usage(llm_response) -> dict[str, int | None]:
    if llm_response is None:
        return {}
    return {
        "input_tokens": llm_response.input_tokens,
        "output_tokens": llm_response.output_tokens,
        "total_tokens": llm_response.total_tokens,
    }
