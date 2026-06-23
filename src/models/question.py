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
        CheckConstraint("status IN ('pending_review', 'approved', 'rejected')", name="ck_questions_status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False, index=True)
    learning_outcome_id: Mapped[int] = mapped_column(ForeignKey("learning_outcomes.id"), nullable=False, index=True)
    document_id: Mapped[int | None] = mapped_column(ForeignKey("documents.id"), nullable=True, index=True)
    question_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list[dict[str, str]] | None] = mapped_column(JSON, nullable=True)
    correct_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    grading_rubric: Mapped[str | None] = mapped_column(Text, nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending_review", nullable=False, index=True)
    created_by_ai: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    source_chunk_ids: Mapped[list[int] | None] = mapped_column(JSON, nullable=True)
    generation_topic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    course = relationship("Course", back_populates="questions")
    learning_outcome = relationship("LearningOutcome", back_populates="questions")
    document = relationship("Document", back_populates="questions")
