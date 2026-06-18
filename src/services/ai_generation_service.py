from __future__ import annotations

from sqlalchemy.orm import Session

from src.ai.parsers.question_parser import QuestionParseError, parse_questions
from src.ai.prompts.question_generation import build_question_generation_messages
from src.ai.providers.llm_provider import LLMProviderError, chat_completion
from src.models.document_chunk import DocumentChunk
from src.repositories.document_chunk_repository import list_document_chunks
from src.repositories.document_repository import get_document
from src.repositories.learning_outcome_repository import get_learning_outcome
from src.repositories.question_repository import create_questions
from src.services.retrieval_service import DEFAULT_TOP_K, MAX_TOP_K, RetrievalError, retrieve_relevant_chunks

MAX_NUM_QUESTIONS = 20


class AIGenerationError(Exception):
    def __init__(self, detail: str, status_code: int = 400, error: str = "AI generation failed") -> None:
        self.detail = detail
        self.status_code = status_code
        self.error = error


def generate_questions_from_chunks(
    db: Session,
    *,
    document_id: int,
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

    document = get_document(db, document_id)
    learning_outcome = get_learning_outcome(db, learning_outcome_id)
    if document is None:
        raise AIGenerationError("Document not found", status_code=404, error="Not found")
    if document.status != "processed":
        raise AIGenerationError("Document must be processed before question generation")
    if learning_outcome is None:
        raise AIGenerationError("Learning outcome not found", status_code=404, error="Not found")
    if learning_outcome.course_id != document.course_id:
        raise AIGenerationError("Learning outcome does not belong to the document course")

    try:
        retrieval = retrieve_relevant_chunks(
            db,
            document_id=document_id,
            learning_outcome_id=learning_outcome_id,
            topic=topic,
            top_k=requested_top_k,
        )
    except RetrievalError as exc:
        raise AIGenerationError(exc.detail, status_code=exc.status_code, error=exc.error) from exc

    selected_chunk_ids = [chunk["chunk_id"] for chunk in retrieval["chunks"]]
    chunks = _chunks_by_ids(list_document_chunks(db, document_id), selected_chunk_ids)
    if not chunks:
        raise AIGenerationError("No selected chunks were available for question generation")

    messages = build_question_generation_messages(
        course=document.course,
        learning_outcome=learning_outcome,
        chunks=chunks,
        question_type=question_type,
        difficulty=difficulty,
        num_questions=requested_count,
        topic=topic,
        diversity_mode=diversity_mode,
    )

    try:
        llm_content = chat_completion(messages=messages)
        parsed_questions = parse_questions(
            llm_content,
            question_type=question_type,
            selected_chunk_ids=selected_chunk_ids,
            max_questions=requested_count,
        )
    except (LLMProviderError, QuestionParseError) as exc:
        raise AIGenerationError(exc.detail, status_code=exc.status_code, error=exc.error) from exc

    saved_questions = create_questions(
        db,
        [
            {
                **question,
                "course_id": document.course_id,
                "learning_outcome_id": learning_outcome_id,
                "document_id": document_id,
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
    if len(saved_questions) < requested_count:
        warnings.append("LLM returned fewer valid questions than requested")

    return {
        "generated": len(saved_questions),
        "document_id": document_id,
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


def _chunks_by_ids(chunks: list[DocumentChunk], selected_chunk_ids: list[int]) -> list[DocumentChunk]:
    by_id = {chunk.id: chunk for chunk in chunks}
    return [by_id[chunk_id] for chunk_id in selected_chunk_ids if chunk_id in by_id]
