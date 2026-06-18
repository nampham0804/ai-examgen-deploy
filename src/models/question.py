from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.repositories.database import Base


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint("question_type IN ('mcq', 'essay')", name="ck_questions_question_type"),
        CheckConstraint("difficulty IN ('easy', 'medium', 'hard')", name="ck_questions_difficulty"),
        CheckConstraint(
            "status IN ('pending_review', 'approved', 'rejected')",
            name="ck_questions_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), index=True)
    learning_outcome_id: Mapped[int] = mapped_column(ForeignKey("learning_outcomes.id"), index=True)
    document_id: Mapped[int | None] = mapped_column(ForeignKey("documents.id"), index=True)
    question_type: Mapped[str] = mapped_column(String(20))
    difficulty: Mapped[str] = mapped_column(String(20))
    question_text: Mapped[str] = mapped_column(Text)
    options: Mapped[list[dict[str, str]] | None] = mapped_column(JSON)
    correct_answer: Mapped[str | None] = mapped_column(Text)
    suggested_answer: Mapped[str | None] = mapped_column(Text)
    grading_rubric: Mapped[str | None] = mapped_column(Text)
    explanation: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="pending_review", index=True)
    created_by_ai: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[int | None] = mapped_column(Integer)
    source_chunk_ids: Mapped[list[int] | None] = mapped_column(JSON)
    generation_topic: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    course = relationship("Course", back_populates="questions")
    learning_outcome = relationship("LearningOutcome", back_populates="questions")
    document = relationship("Document", back_populates="questions")
