from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any


class QuestionParseError(Exception):
    def __init__(self, detail: str, status_code: int = 502, error: str = "Invalid LLM output") -> None:
        self.detail = detail
        self.status_code = status_code
        self.error = error


@dataclass(frozen=True)
class ParsedQuestionBatch:
    questions: list[dict]
    warnings: list[str]


def parse_questions(
    content: str,
    *,
    question_type: str,
    selected_chunk_ids: list[int],
    max_questions: int,
) -> list[dict]:
    batch = parse_questions_with_warnings(
        content,
        question_type=question_type,
        selected_chunk_ids=selected_chunk_ids,
        max_questions=max_questions,
    )
    if batch.warnings:
        raise QuestionParseError("; ".join(batch.warnings))
    return batch.questions


def parse_questions_with_warnings(
    content: str,
    *,
    question_type: str,
    selected_chunk_ids: list[int],
    max_questions: int,
) -> ParsedQuestionBatch:
    payload = _load_json(content)
    raw_questions = payload.get("questions") if isinstance(payload, dict) else payload
    if not isinstance(raw_questions, list):
        raise QuestionParseError("LLM output must include a questions list")

    parsed = []
    warnings = []
    for index, item in enumerate(raw_questions[:max_questions], start=1):
        try:
            parsed.append(_parse_question(item, question_type=question_type, selected_chunk_ids=selected_chunk_ids))
        except QuestionParseError as exc:
            warnings.append(f"Rejected question {index} during parsing: {exc.detail}")
    if not parsed:
        detail = "LLM output did not contain any parseable questions"
        if warnings:
            detail = f"{detail}: {'; '.join(warnings)}"
        raise QuestionParseError(detail)
    return ParsedQuestionBatch(questions=parsed, warnings=warnings)


def _load_json(content: str) -> Any:
    content = _strip_thinking(content).strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    fenced_payloads = re.findall(r"```(?:json)?\s*(?P<json>.*?)\s*```", content, re.DOTALL | re.IGNORECASE)
    fenced_matches = []
    for fenced_payload in fenced_payloads:
        try:
            payload = json.loads(fenced_payload)
        except json.JSONDecodeError:
            continue
        if _looks_like_questions_payload(payload):
            fenced_matches.append(payload)
    if len(fenced_matches) == 1:
        return fenced_matches[0]
    if len(fenced_matches) > 1:
        raise QuestionParseError("LLM output contains multiple JSON question payloads")

    candidates = _json_candidates(content)
    if len(candidates) == 1:
        return candidates[0]
    if len(candidates) > 1:
        raise QuestionParseError("LLM output contains multiple possible JSON question payloads")

    raise QuestionParseError("Could not parse JSON from LLM output")


def _strip_thinking(content: str) -> str:
    return re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL | re.IGNORECASE)


def _json_candidates(content: str) -> list[Any]:
    decoder = json.JSONDecoder()
    candidates = []
    for index, char in enumerate(content):
        if char not in "{[":
            continue
        try:
            payload, _ = decoder.raw_decode(content[index:])
        except json.JSONDecodeError:
            continue
        if _looks_like_questions_payload(payload):
            candidates.append(payload)
    return candidates


def _looks_like_questions_payload(payload: Any) -> bool:
    if isinstance(payload, dict):
        questions = payload.get("questions")
        return isinstance(questions, list)
    if isinstance(payload, list):
        return any(isinstance(item, dict) and "question_text" in item for item in payload)
    return False


def _parse_question(item: Any, *, question_type: str, selected_chunk_ids: list[int]) -> dict:
    if not isinstance(item, dict):
        raise QuestionParseError("Each generated question must be an object")

    question_text = _required_text(item, "question_text")
    explanation = _optional_text(item, "explanation") or _optional_text(item, "source_note")
    source_chunk_ids = _source_chunk_ids(item.get("source_chunk_ids"), selected_chunk_ids)

    if question_type == "mcq":
        options = _parse_options(item.get("options"))
        correct_answer = _parse_correct_answer(item.get("correct_answer"), options)
        return {
            "question_text": question_text,
            "options": options,
            "correct_answer": correct_answer,
            "suggested_answer": None,
            "grading_rubric": None,
            "explanation": explanation,
            "source_chunk_ids": source_chunk_ids,
        }

    return {
        "question_text": question_text,
        "options": None,
        "correct_answer": None,
        "suggested_answer": _required_text(item, "suggested_answer"),
        "grading_rubric": _required_text(item, "grading_rubric"),
        "explanation": explanation,
        "source_chunk_ids": source_chunk_ids,
    }


def _parse_options(value: Any) -> list[dict[str, str]]:
    if isinstance(value, dict):
        options = [{"label": label, "text": text} for label, text in value.items()]
    elif isinstance(value, list):
        if all(isinstance(option, str) for option in value):
            if len(value) != 4:
                raise QuestionParseError("MCQ options must include exactly 4 choices")
            labels = ["A", "B", "C", "D"]
            options = [{"label": labels[index], "text": text} for index, text in enumerate(value)]
        else:
            options = value
    else:
        raise QuestionParseError("MCQ options must be a list or object")

    normalized: list[dict[str, str]] = []
    for option in options:
        if not isinstance(option, dict):
            raise QuestionParseError("Each MCQ option must be an object")
        label = str(option.get("label", "")).upper()
        text = str(option.get("text", "")).strip()
        if label not in {"A", "B", "C", "D"} or not text:
            raise QuestionParseError("MCQ options must include non-empty A, B, C, D choices")
        normalized.append({"label": label, "text": text})

    labels = [option["label"] for option in normalized]
    if len(labels) != 4 or set(labels) != {"A", "B", "C", "D"}:
        raise QuestionParseError("MCQ options must be exactly A, B, C, D")
    return sorted(normalized, key=lambda option: option["label"])


def _parse_correct_answer(value: Any, options: list[dict[str, str]]) -> str:
    correct_answer = _text_value(value)
    if correct_answer is None:
        raise QuestionParseError("Question is missing required field: correct_answer")

    label = correct_answer.upper()
    if label in {"A", "B", "C", "D"}:
        return label

    normalized_answer = _normalize_text(correct_answer)
    for option in options:
        if normalized_answer == _normalize_text(option["text"]):
            return option["label"]
    raise QuestionParseError("MCQ correct_answer must match one option label or option text")


def _source_chunk_ids(value: Any, selected_chunk_ids: list[int]) -> list[int]:
    if not isinstance(value, list):
        return []
    valid_ids = []
    selected = set(selected_chunk_ids)
    for item in value:
        try:
            chunk_id = int(item)
        except (TypeError, ValueError):
            continue
        if chunk_id in selected:
            valid_ids.append(chunk_id)
    return valid_ids


def _required_text(item: dict, field: str) -> str:
    value = _optional_text(item, field)
    if value is None:
        raise QuestionParseError(f"Question is missing required field: {field}")
    return value


def _optional_text(item: dict, field: str) -> str | None:
    return _text_value(item.get(field))


def _text_value(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, dict | list):
        return None
    text = str(value).strip()
    return text or None


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.casefold()).strip()
