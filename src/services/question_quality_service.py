from __future__ import annotations

import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Protocol

MIN_QUESTION_CHARS = 12
MIN_QUESTION_TOKENS = 3
DUPLICATE_RATIO_THRESHOLD = 0.94
DUPLICATE_JACCARD_THRESHOLD = 0.85


class ExistingQuestion(Protocol):
    question_text: str


@dataclass(frozen=True)
class QuestionQualityResult:
    valid_questions: list[dict]
    warnings: list[str]
    rejected_count: int


def validate_generated_questions(
    questions: list[dict],
    *,
    question_type: str,
    selected_chunk_ids: list[int],
    existing_questions: list[ExistingQuestion],
) -> QuestionQualityResult:
    valid_questions = []
    warnings = []
    accepted_texts: list[str] = []
    existing_texts = [question.question_text for question in existing_questions]

    for index, question in enumerate(questions, start=1):
        reasons = _quality_errors(
            question,
            question_type=question_type,
            selected_chunk_ids=selected_chunk_ids,
            existing_texts=existing_texts,
            accepted_texts=accepted_texts,
        )
        if reasons:
            warnings.append(f"Rejected question {index}: {'; '.join(reasons)}")
            continue

        accepted_texts.append(question["question_text"])
        valid_questions.append(question)

    return QuestionQualityResult(
        valid_questions=valid_questions,
        warnings=warnings,
        rejected_count=len(questions) - len(valid_questions),
    )


def _quality_errors(
    question: dict,
    *,
    question_type: str,
    selected_chunk_ids: list[int],
    existing_texts: list[str],
    accepted_texts: list[str],
) -> list[str]:
    errors = []
    question_text = str(question.get("question_text") or "").strip()
    if _is_too_short(question_text):
        errors.append("question_text is too short")

    source_chunk_ids = question.get("source_chunk_ids")
    if not isinstance(source_chunk_ids, list) or not source_chunk_ids:
        errors.append("source_chunk_ids must not be empty")
    else:
        selected = set(selected_chunk_ids)
        invalid_source_ids = [chunk_id for chunk_id in source_chunk_ids if chunk_id not in selected]
        if invalid_source_ids:
            errors.append("source_chunk_ids must come from retrieved chunks")

    if question_type == "mcq":
        errors.extend(_mcq_errors(question))
    else:
        errors.extend(_essay_errors(question))

    if _has_duplicate(question_text, [*existing_texts, *accepted_texts]):
        errors.append("question_text is a near-duplicate in this document/course")

    return errors


def _mcq_errors(question: dict) -> list[str]:
    errors = []
    options = question.get("options")
    if not isinstance(options, list) or len(options) != 4:
        errors.append("MCQ must include exactly 4 options")
        return errors

    labels = []
    option_texts = []
    for option in options:
        if not isinstance(option, dict):
            errors.append("MCQ option must be an object")
            continue
        label = str(option.get("label") or "").strip().upper()
        text = str(option.get("text") or "").strip()
        labels.append(label)
        option_texts.append(text)
        if not text:
            errors.append("MCQ option text must not be empty")

    if set(labels) != {"A", "B", "C", "D"} or len(labels) != len(set(labels)):
        errors.append("MCQ option labels must be A, B, C, D")

    correct_answer = str(question.get("correct_answer") or "").strip()
    if not correct_answer:
        errors.append("MCQ correct_answer is required")
    elif not _answer_matches_option(correct_answer, labels, option_texts):
        errors.append("MCQ correct_answer must match one option label or option text")

    return errors


def _essay_errors(question: dict) -> list[str]:
    errors = []
    if not str(question.get("suggested_answer") or "").strip():
        errors.append("Essay suggested_answer is required")
    if not str(question.get("grading_rubric") or "").strip():
        errors.append("Essay grading_rubric is required")
    return errors


def _answer_matches_option(correct_answer: str, labels: list[str], option_texts: list[str]) -> bool:
    normalized_answer = _normalize_text(correct_answer)
    if correct_answer.upper() in labels:
        return True
    return any(normalized_answer == _normalize_text(option_text) for option_text in option_texts)


def _is_too_short(text: str) -> bool:
    return len(text) < MIN_QUESTION_CHARS or len(_tokens(text)) < MIN_QUESTION_TOKENS


def _has_duplicate(question_text: str, existing_texts: list[str]) -> bool:
    normalized = _normalize_text(question_text)
    if not normalized:
        return False

    for existing_text in existing_texts:
        existing = _normalize_text(existing_text)
        if not existing:
            continue
        if normalized == existing:
            return True
        if _similarity(normalized, existing) >= DUPLICATE_RATIO_THRESHOLD and _jaccard(normalized, existing) >= DUPLICATE_JACCARD_THRESHOLD:
            return True
    return False


def _similarity(left: str, right: str) -> float:
    return SequenceMatcher(None, left, right).ratio()


def _jaccard(left: str, right: str) -> float:
    left_tokens = set(_tokens(left))
    right_tokens = set(_tokens(right))
    if not left_tokens or not right_tokens:
        return 0.0
    return len(left_tokens & right_tokens) / len(left_tokens | right_tokens)


def _tokens(text: str) -> list[str]:
    return re.findall(r"\w+", text.casefold())


def _normalize_text(text: str) -> str:
    compact = " ".join(_tokens(text))
    return compact.strip()
