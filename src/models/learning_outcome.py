from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.repositories.database import Base


class LearningOutcome(Base):
    __tablename__ = "learning_outcomes"
    __table_args__ = (UniqueConstraint("course_id", "code", name="uq_learning_outcome_course_code"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(Text)
    bloom_level: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    course = relationship("Course", back_populates="learning_outcomes")
    questions = relationship("Question", back_populates="learning_outcome")
