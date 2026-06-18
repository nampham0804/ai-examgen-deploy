import pytest

from src.ai.parsers.question_parser import QuestionParseError, parse_questions_with_warnings


def test_parse_questions_strips_think_block_before_json():
    content = """
    <think>I should reason privately here.</think>
    {
      "questions": [
        {
          "question_text": "Which concept describes a database management system?",
          "options": {
            "A": "A system for managing databases",
            "B": "A spreadsheet formula",
            "C": "A network cable",
            "D": "A display device"
          },
          "correct_answer": "A system for managing databases",
          "explanation": "The chunk defines DBMS as database management software.",
          "source_chunk_ids": [10]
        }
      ]
    }
    """

    batch = parse_questions_with_warnings(
        content,
        question_type="mcq",
        selected_chunk_ids=[10],
        max_questions=1,
    )

    assert batch.warnings == []
    assert batch.questions[0]["correct_answer"] == "A"
    assert batch.questions[0]["source_chunk_ids"] == [10]


def test_parse_questions_returns_warning_for_malformed_mcq_when_valid_question_exists():
    content = {
        "questions": [
            {
                "question_text": "Which option is malformed?",
                "options": [{"label": "A", "text": "Only one option"}],
                "correct_answer": "A",
                "source_chunk_ids": [1],
            },
            {
                "question_text": "Which option describes structured data storage?",
                "options": ["A database", "A monitor", "A keyboard", "A cable"],
                "correct_answer": "A database",
                "explanation": "The source discusses databases.",
                "source_chunk_ids": [1],
            },
        ]
    }

    batch = parse_questions_with_warnings(
        str(content).replace("'", '"'),
        question_type="mcq",
        selected_chunk_ids=[1],
        max_questions=2,
    )

    assert len(batch.questions) == 1
    assert batch.questions[0]["correct_answer"] == "A"
    assert batch.warnings
    assert "Rejected question 1" in batch.warnings[0]


def test_parse_questions_rejects_unsafe_multiple_json_payloads():
    content = '{"questions": []} trailing {"questions": []}'

    with pytest.raises(QuestionParseError, match="multiple possible JSON"):
        parse_questions_with_warnings(
            content,
            question_type="mcq",
            selected_chunk_ids=[1],
            max_questions=2,
        )
