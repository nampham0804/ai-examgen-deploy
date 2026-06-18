import json
from types import SimpleNamespace

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
