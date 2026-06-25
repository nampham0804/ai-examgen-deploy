from __future__ import annotations

import json

from src.models.course import Course
from src.models.document_chunk import DocumentChunk
from src.models.learning_outcome import LearningOutcome


def build_question_generation_messages(
    *,
    course: Course | None,
    learning_outcome: LearningOutcome,
    chunks: list[DocumentChunk],
    question_type: str,
    difficulty: str,
    num_questions: int,
    topic: str | None,
    diversity_mode: bool,
    existing_question_texts: list[str] | None = None,
) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": (
                "You generate course assessment questions from provided source chunks only. "
                "Return valid JSON only. Do not invent facts outside the chunks."
            ),
        },
        {
            "role": "user",
            "content": _build_user_prompt(
                course=course,
                learning_outcome=learning_outcome,
                chunks=chunks,
                question_type=question_type,
                difficulty=difficulty,
                num_questions=num_questions,
                topic=topic,
                diversity_mode=diversity_mode,
                existing_question_texts=existing_question_texts or [],
            ),
        },
    ]


def _build_user_prompt(
    *,
    course: Course | None,
    learning_outcome: LearningOutcome,
    chunks: list[DocumentChunk],
    question_type: str,
    difficulty: str,
    num_questions: int,
    topic: str | None,
    diversity_mode: bool,
    existing_question_texts: list[str],
) -> str:
    payload = {
        "course": _course_payload(course),
        "learning_outcome": {
            "id": learning_outcome.id,
            "code": learning_outcome.code,
            "description": learning_outcome.description,
            "bloom_level": learning_outcome.bloom_level,
        },
        "generation_request": {
            "question_type": question_type,
            "difficulty": difficulty,
            "num_questions": num_questions,
            "topic": topic,
            "diversity_mode": diversity_mode,
        },
        "source_chunks": [_chunk_payload(chunk) for chunk in chunks],
        "existing_questions_to_avoid": [
            {"question_text": text}
            for text in existing_question_texts[:20]
            if text.strip()
        ],
    }
    schema = _mcq_schema() if question_type == "mcq" else _essay_schema()
    return (
        "Use only the source_chunks in this request. Do not use outside knowledge. "
        "If the chunks do not contain enough evidence, generate fewer questions rather than inventing facts. "
        "Avoid duplicate or near-duplicate questions. "
        "Do not repeat or paraphrase existing_questions_to_avoid. "
        "Each question should assess a different concept or aspect from the available chunks. "
        "Set source_chunk_ids to the chunk_id values that support each question. "
        "Return JSON only with this shape:\n"
        f"{schema}\n\n"
        "Generation context:\n"
        f"{json.dumps(payload, ensure_ascii=False, indent=2)}"
    )


def _course_payload(course: Course | None) -> dict | None:
    if course is None:
        return None
    return {
        "id": course.id,
        "code": course.code,
        "name": course.name,
        "description": course.description,
    }


def _chunk_payload(chunk: DocumentChunk) -> dict:
    return {
        "chunk_id": chunk.id,
        "title": chunk.title,
        "section_path": chunk.section_path,
        "keywords": chunk.keywords or [],
        "text": chunk.text,
    }


def _mcq_schema() -> str:
    return json.dumps(
        {
            "questions": [
                {
                    "question_text": "string",
                    "options": [
                        {"label": "A", "text": "string"},
                        {"label": "B", "text": "string"},
                        {"label": "C", "text": "string"},
                        {"label": "D", "text": "string"},
                    ],
                    "correct_answer": "A",
                    "explanation": "string",
                    "source_chunk_ids": [1],
                }
            ]
        },
        ensure_ascii=False,
        indent=2,
    )


def _essay_schema() -> str:
    return json.dumps(
        {
            "questions": [
                {
                    "question_text": "string",
                    "suggested_answer": "string",
                    "grading_rubric": "string",
                    "explanation": "string",
                    "source_chunk_ids": [1],
                }
            ]
        },
        ensure_ascii=False,
        indent=2,
    )
