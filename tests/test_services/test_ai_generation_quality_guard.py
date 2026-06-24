import json
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.ai.providers.llm_provider import LLMResponse
from src.models.course import Course
from src.models.document import Document
from src.models.document_chunk import DocumentChunk
from src.models.learning_outcome import LearningOutcome
from src.models.question import Question
from src.repositories.database import Base
from src.services import ai_generation_service


def test_generate_questions_saves_quality_valid_mcq_as_pending_review(monkeypatch):
    db, chunk_id, document_id, learning_outcome_id = _seed_generation_db()
    content = json.dumps(
        {
            "questions": [
                {
                    "question_text": "Which option best describes a database management system?",
                    "options": {
                        "A": "Software for defining and managing databases",
                        "B": "A physical network cable",
                        "C": "A computer monitor",
                        "D": "A keyboard shortcut",
                    },
                    "correct_answer": "A",
                    "explanation": "The retrieved chunk describes DBMS software.",
                    "source_chunk_ids": [chunk_id],
                }
            ]
        }
    )

    monkeypatch.setattr(
        ai_generation_service,
        "get_llm_provider_metadata",
        lambda: SimpleNamespace(provider="mock_provider", model="mock_model", temperature=0.0),
    )
    monkeypatch.setattr(
        ai_generation_service,
        "chat_completion_with_metadata",
        lambda messages: LLMResponse(content=content, provider="mock_provider", model="mock_model"),
    )
    monkeypatch.setattr(
        ai_generation_service,
        "retrieve_relevant_chunks",
        lambda db, document_id, learning_outcome_id, topic, top_k: {
            "chunks": [{"chunk_id": chunk_id, "score": 1.0}]
        },
    )

    result = ai_generation_service.generate_questions_from_chunks(
        db,
        document_id=document_id,
        learning_outcome_id=learning_outcome_id,
        question_type="mcq",
        difficulty="medium",
        num_questions=1,
        top_k=1,
    )

    saved_question = db.query(Question).one()
    assert result["generated"] == 1
    assert saved_question.status == "pending_review"
    assert saved_question.source_chunk_ids == [chunk_id]


def test_generate_questions_injects_existing_question_texts_into_prompt(monkeypatch):
    db, chunk_id, document_id, learning_outcome_id = _seed_generation_db()
    document = db.get(Document, document_id)
    db.add(
        Question(
            course_id=document.course_id,
            document_id=document_id,
            learning_outcome_id=learning_outcome_id,
            question_type="mcq",
            difficulty="medium",
            question_text="What is the role of a database management system?",
            options=[
                {"label": "A", "text": "It manages databases"},
                {"label": "B", "text": "It paints slides"},
                {"label": "C", "text": "It edits images"},
                {"label": "D", "text": "It replaces networks"},
            ],
            correct_answer="A",
            status="pending_review",
            created_by_ai=True,
            source_chunk_ids=[chunk_id],
        )
    )
    db.commit()
    captured_messages = {}
    content = json.dumps(
        {
            "questions": [
                {
                    "question_text": "Which option best describes DBMS software responsibilities?",
                    "options": {
                        "A": "Defining and managing databases",
                        "B": "Formatting a monitor",
                        "C": "Replacing a keyboard",
                        "D": "Drawing network cables",
                    },
                    "correct_answer": "A",
                    "explanation": "The retrieved chunk describes DBMS software.",
                    "source_chunk_ids": [chunk_id],
                }
            ]
        }
    )

    monkeypatch.setattr(
        ai_generation_service,
        "get_llm_provider_metadata",
        lambda: SimpleNamespace(provider="mock_provider", model="mock_model", temperature=0.0),
    )

    def fake_chat_completion(*, messages):
        captured_messages["messages"] = messages
        return LLMResponse(content=content, provider="mock_provider", model="mock_model")

    monkeypatch.setattr(ai_generation_service, "chat_completion_with_metadata", fake_chat_completion)
    monkeypatch.setattr(
        ai_generation_service,
        "retrieve_relevant_chunks",
        lambda db, document_id, learning_outcome_id, topic, top_k: {
            "chunks": [{"chunk_id": chunk_id, "score": 1.0}]
        },
    )

    ai_generation_service.generate_questions_from_chunks(
        db,
        document_id=document_id,
        learning_outcome_id=learning_outcome_id,
        question_type="mcq",
        difficulty="medium",
        num_questions=1,
        top_k=1,
    )

    prompt = captured_messages["messages"][1]["content"]
    assert "existing_questions_to_avoid" in prompt
    assert "What is the role of a database management system?" in prompt
    assert "Do not repeat or paraphrase existing_questions_to_avoid" in prompt


def test_generate_questions_supports_multiple_document_ids_and_merges_retrieved_chunks(monkeypatch):
    db, first_chunk_id, first_document_id, learning_outcome_id = _seed_generation_db()
    second_document_id, second_chunk_id = _add_processed_document(
        db,
        course_id=db.get(Document, first_document_id).course_id,
        text="An entity relationship model describes entities, attributes, and relationships.",
        title="ER model overview",
    )
    captured_messages = {}
    retrieval_calls = []
    content = json.dumps(
        {
            "questions": [
                {
                    "question_text": "Which statement best describes the role of an ER model?",
                    "options": {
                        "A": "It represents entities, attributes, and relationships",
                        "B": "It configures a keyboard shortcut",
                        "C": "It changes a monitor cable",
                        "D": "It compresses an image file",
                    },
                    "correct_answer": "A",
                    "explanation": "The second retrieved chunk describes ER model concepts.",
                    "source_chunk_ids": [second_chunk_id],
                }
            ]
        }
    )

    monkeypatch.setattr(
        ai_generation_service,
        "get_llm_provider_metadata",
        lambda: SimpleNamespace(provider="mock_provider", model="mock_model", temperature=0.0),
    )

    def fake_chat_completion(*, messages):
        captured_messages["messages"] = messages
        return LLMResponse(content=content, provider="mock_provider", model="mock_model")

    def fake_retrieve(db, document_id, learning_outcome_id, topic, top_k):
        retrieval_calls.append(document_id)
        chunk_id = first_chunk_id if document_id == first_document_id else second_chunk_id
        return {"chunks": [{"chunk_id": chunk_id, "chunk_index": 0, "score": 1.0}]}

    monkeypatch.setattr(ai_generation_service, "chat_completion_with_metadata", fake_chat_completion)
    monkeypatch.setattr(ai_generation_service, "retrieve_relevant_chunks", fake_retrieve)

    result = ai_generation_service.generate_questions_from_chunks(
        db,
        document_ids=[first_document_id, second_document_id],
        learning_outcome_id=learning_outcome_id,
        question_type="mcq",
        difficulty="medium",
        num_questions=1,
        top_k=1,
    )

    prompt = captured_messages["messages"][1]["content"]
    assert retrieval_calls == [first_document_id, second_document_id]
    assert "A DBMS is software for defining and managing databases." in prompt
    assert "An entity relationship model describes entities, attributes, and relationships." in prompt
    assert result["document_id"] == first_document_id
    assert result["document_ids"] == [first_document_id, second_document_id]
    assert result["source_chunk_ids"] == [first_chunk_id, second_chunk_id]
    assert db.query(Question).count() == 1


def test_generate_questions_still_rejects_existing_duplicate_after_llm(monkeypatch):
    db, chunk_id, document_id, learning_outcome_id = _seed_generation_db()
    document = db.get(Document, document_id)
    duplicate_text = "Which option best describes a database management system?"
    db.add(
        Question(
            course_id=document.course_id,
            document_id=document_id,
            learning_outcome_id=learning_outcome_id,
            question_type="mcq",
            difficulty="medium",
            question_text=duplicate_text,
            options=[
                {"label": "A", "text": "Software for defining and managing databases"},
                {"label": "B", "text": "A physical network cable"},
                {"label": "C", "text": "A computer monitor"},
                {"label": "D", "text": "A keyboard shortcut"},
            ],
            correct_answer="A",
            status="pending_review",
            created_by_ai=True,
            source_chunk_ids=[chunk_id],
        )
    )
    db.commit()
    content = json.dumps(
        {
            "questions": [
                {
                    "question_text": duplicate_text,
                    "options": {
                        "A": "Software for defining and managing databases",
                        "B": "A physical network cable",
                        "C": "A computer monitor",
                        "D": "A keyboard shortcut",
                    },
                    "correct_answer": "A",
                    "explanation": "The retrieved chunk describes DBMS software.",
                    "source_chunk_ids": [chunk_id],
                }
            ]
        }
    )

    monkeypatch.setattr(
        ai_generation_service,
        "get_llm_provider_metadata",
        lambda: SimpleNamespace(provider="mock_provider", model="mock_model", temperature=0.0),
    )
    monkeypatch.setattr(
        ai_generation_service,
        "chat_completion_with_metadata",
        lambda messages: LLMResponse(content=content, provider="mock_provider", model="mock_model"),
    )
    monkeypatch.setattr(
        ai_generation_service,
        "retrieve_relevant_chunks",
        lambda db, document_id, learning_outcome_id, topic, top_k: {
            "chunks": [{"chunk_id": chunk_id, "score": 1.0}]
        },
    )

    with pytest.raises(ai_generation_service.AIGenerationError) as exc:
        ai_generation_service.generate_questions_from_chunks(
            db,
            document_id=document_id,
            learning_outcome_id=learning_outcome_id,
            question_type="mcq",
            difficulty="medium",
            num_questions=1,
            top_k=1,
        )

    assert exc.value.error == "Question validation failed"
    assert db.query(Question).count() == 1


def test_generate_questions_rejects_duplicate_from_any_selected_document(monkeypatch):
    db, first_chunk_id, first_document_id, learning_outcome_id = _seed_generation_db()
    course_id = db.get(Document, first_document_id).course_id
    second_document_id, second_chunk_id = _add_processed_document(
        db,
        course_id=course_id,
        text="An entity relationship model describes entities, attributes, and relationships.",
        title="ER model overview",
    )
    duplicate_text = "Explain the purpose of an entity relationship model."
    db.add(
        Question(
            course_id=course_id,
            document_id=second_document_id,
            learning_outcome_id=learning_outcome_id,
            question_type="essay",
            difficulty="medium",
            question_text=duplicate_text,
            suggested_answer="It models entities, attributes, and relationships.",
            grading_rubric="Mentions entities, attributes, and relationships.",
            status="pending_review",
            created_by_ai=True,
            source_chunk_ids=[second_chunk_id],
        )
    )
    db.commit()
    content = json.dumps(
        {
            "questions": [
                {
                    "question_text": duplicate_text,
                    "suggested_answer": "It models entities, attributes, and relationships.",
                    "grading_rubric": "Mentions entities, attributes, and relationships.",
                    "explanation": "The retrieved chunk describes ER model concepts.",
                    "source_chunk_ids": [second_chunk_id],
                }
            ]
        }
    )

    monkeypatch.setattr(
        ai_generation_service,
        "get_llm_provider_metadata",
        lambda: SimpleNamespace(provider="mock_provider", model="mock_model", temperature=0.0),
    )
    monkeypatch.setattr(
        ai_generation_service,
        "chat_completion_with_metadata",
        lambda messages: LLMResponse(content=content, provider="mock_provider", model="mock_model"),
    )
    monkeypatch.setattr(
        ai_generation_service,
        "retrieve_relevant_chunks",
        lambda db, document_id, learning_outcome_id, topic, top_k: {
            "chunks": [
                {
                    "chunk_id": first_chunk_id if document_id == first_document_id else second_chunk_id,
                    "chunk_index": 0,
                    "score": 1.0,
                }
            ]
        },
    )

    with pytest.raises(ai_generation_service.AIGenerationError) as exc:
        ai_generation_service.generate_questions_from_chunks(
            db,
            document_ids=[first_document_id, second_document_id],
            learning_outcome_id=learning_outcome_id,
            question_type="essay",
            difficulty="medium",
            num_questions=1,
            top_k=1,
        )

    assert exc.value.error == "Question validation failed"
    assert db.query(Question).count() == 1


def _seed_generation_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    db = session_factory()

    course = Course(code="CSDL", name="Database Systems", description=None)
    db.add(course)
    db.flush()

    learning_outcome = LearningOutcome(
        course_id=course.id,
        code="LO1",
        description="Explain basic database management system concepts.",
        bloom_level=None,
    )
    document = Document(
        course_id=course.id,
        uploaded_by=1,
        file_name="sample.pdf",
        stored_file_name="sample.pdf",
        file_type="pdf",
        document_type="lecture",
        mime_type="application/pdf",
        file_path="uploads/sample.pdf",
        file_size_bytes=100,
        page_count=1,
        extracted_text="A DBMS is software for defining and managing databases.",
        text_length=58,
        chunk_count=1,
        status="processed",
        error_message=None,
    )
    db.add_all([learning_outcome, document])
    db.flush()

    chunk = DocumentChunk(
        document_id=document.id,
        course_id=course.id,
        chunk_index=0,
        title="DBMS overview",
        section_path="Introduction",
        text="A DBMS is software for defining and managing databases.",
        keywords=["dbms", "database"],
        token_count=10,
        page_start=None,
        page_end=None,
    )
    db.add(chunk)
    db.commit()

    return db, chunk.id, document.id, learning_outcome.id


def _add_processed_document(db, *, course_id: int, text: str, title: str):
    document = Document(
        course_id=course_id,
        uploaded_by=1,
        file_name=f"{title}.pdf",
        stored_file_name=f"{title}.pdf",
        file_type="pdf",
        document_type="lecture",
        mime_type="application/pdf",
        file_path=f"uploads/{title}.pdf",
        file_size_bytes=100,
        page_count=1,
        extracted_text=text,
        text_length=len(text),
        chunk_count=1,
        status="processed",
        error_message=None,
    )
    db.add(document)
    db.flush()

    chunk = DocumentChunk(
        document_id=document.id,
        course_id=course_id,
        chunk_index=0,
        title=title,
        section_path="Introduction",
        text=text,
        keywords=["database", "model"],
        token_count=10,
        page_start=None,
        page_end=None,
    )
    db.add(chunk)
    db.commit()
    return document.id, chunk.id
