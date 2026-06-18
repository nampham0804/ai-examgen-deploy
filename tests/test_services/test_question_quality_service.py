from types import SimpleNamespace

from src.services.question_quality_service import validate_generated_questions


def test_validate_generated_questions_rejects_malformed_mcq():
    result = validate_generated_questions(
        [
            {
                "question_text": "Which answer is valid for this database question?",
                "options": [
                    {"label": "A", "text": "A database table"},
                    {"label": "B", "text": "A query"},
                    {"label": "C", "text": "A schema"},
                ],
                "correct_answer": "A",
                "source_chunk_ids": [7],
            }
        ],
        question_type="mcq",
        selected_chunk_ids=[7],
        existing_questions=[],
    )

    assert result.valid_questions == []
    assert result.rejected_count == 1
    assert "exactly 4 options" in result.warnings[0]


def test_validate_generated_questions_rejects_empty_or_unretrieved_sources():
    result = validate_generated_questions(
        [
            {
                "question_text": "Which answer is supported by a retrieved chunk?",
                "options": [
                    {"label": "A", "text": "A database"},
                    {"label": "B", "text": "A screen"},
                    {"label": "C", "text": "A keyboard"},
                    {"label": "D", "text": "A mouse"},
                ],
                "correct_answer": "A",
                "source_chunk_ids": [99],
            }
        ],
        question_type="mcq",
        selected_chunk_ids=[7],
        existing_questions=[],
    )

    assert result.valid_questions == []
    assert "retrieved chunks" in result.warnings[0]


def test_validate_generated_questions_rejects_near_duplicate_existing_question():
    existing = SimpleNamespace(question_text="Explain the purpose of a database management system.")
    result = validate_generated_questions(
        [
            {
                "question_text": "Explain the purpose of a database management system",
                "options": None,
                "correct_answer": None,
                "suggested_answer": "It manages databases.",
                "grading_rubric": "Mentions storage, retrieval, and management.",
                "source_chunk_ids": [3],
            }
        ],
        question_type="essay",
        selected_chunk_ids=[3],
        existing_questions=[existing],
    )

    assert result.valid_questions == []
    assert "near-duplicate" in result.warnings[0]


def test_validate_generated_questions_accepts_valid_essay():
    result = validate_generated_questions(
        [
            {
                "question_text": "Explain why data independence is useful in database systems.",
                "options": None,
                "correct_answer": None,
                "suggested_answer": "It allows schema changes without changing application code.",
                "grading_rubric": "Awards credit for logical and physical independence.",
                "source_chunk_ids": [3],
            }
        ],
        question_type="essay",
        selected_chunk_ids=[3],
        existing_questions=[],
    )

    assert len(result.valid_questions) == 1
    assert result.warnings == []
