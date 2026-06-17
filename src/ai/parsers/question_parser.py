from __future__ import annotations

import json
import re
from typing import Any


class QuestionParseError(Exception):
    def __init__(self, detail: str, status_code: int = 502, error: str = "Invalid LLM output") -> None:
        self.detail = detail
        self.status_code = status_code
        self.error = error


def parse_questions(
    content: str,
    *,
    question_type: str,
    selected_chunk_ids: list[int],
    max_questions: int,
) -> list[dict]:
    payload = _load_json(content)
    raw_questions = payload.get("questions") if isinstance(payload, dict) else payload
    if not isinstance(raw_questions, list):
        raise QuestionParseError("LLM output must include a questions list")

    parsed = [
        _parse_question(item, question_type=question_type, selected_chunk_ids=selected_chunk_ids)
        for item in raw_questions[:max_questions]
    ]
    if not parsed:
        raise QuestionParseError("LLM output did not contain any valid questions")
    return parsed


def _load_json(content: str) -> Any:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    match = re.search(r"```(?:json)?\s*(?P<json>.*?)\s*```", content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group("json"))
        except json.JSONDecodeError:
            pass

    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(content[start : end + 1])
        except json.JSONDecodeError as exc:
            raise QuestionParseError("Could not parse JSON object from LLM output") from exc

    raise QuestionParseError("Could not parse JSON from LLM output")


def _parse_question(item: Any, *, question_type: str, selected_chunk_ids: list[int]) -> dict:
    if not isinstance(item, dict):
        raise QuestionParseError("Each generated question must be an object")

    question_text = _required_text(item, "question_text")
    explanation = _optional_text(item, "explanation") or _optional_text(item, "source_note")
    source_chunk_ids = _source_chunk_ids(item.get("source_chunk_ids"), selected_chunk_ids)

    if question_type == "mcq":
        options = _parse_options(item.get("options"))
        correct_answer = _required_text(item, "correct_answer").upper()
        if correct_answer not in {"A", "B", "C", "D"}:
            raise QuestionParseError("MCQ correct_answer must be one of A, B, C, D")
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
    if labels != ["A", "B", "C", "D"]:
        raise QuestionParseError("MCQ options must be exactly A, B, C, D in order")
    return normalized


def _source_chunk_ids(value: Any, selected_chunk_ids: list[int]) -> list[int]:
    if not isinstance(value, list):
        return selected_chunk_ids
    valid_ids = []
    selected = set(selected_chunk_ids)
    for item in value:
        try:
            chunk_id = int(item)
        except (TypeError, ValueError):
            continue
        if chunk_id in selected:
            valid_ids.append(chunk_id)
    return valid_ids or selected_chunk_ids


def _required_text(item: dict, field: str) -> str:
    value = _optional_text(item, field)
    if value is None:
        raise QuestionParseError(f"Question is missing required field: {field}")
    return value


def _optional_text(item: dict, field: str) -> str | None:
    value = item.get(field)
    if value is None:
        return None
    text = str(value).strip()
    return text or None
