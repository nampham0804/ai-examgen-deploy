from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.repositories.database import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    learning_outcomes = relationship(
        "LearningOutcome",
        back_populates="course",
        cascade="all, delete-orphan",
    )
    documents = relationship("Document", back_populates="course")
    questions = relationship("Question", back_populates="course")
