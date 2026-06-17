from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.repositories.database import Base


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (
        CheckConstraint(
            "status IN ('uploaded', 'processing', 'processed', 'failed')",
            name="ck_documents_status",
        ),
        CheckConstraint(
            "document_type IN ('syllabus', 'lecture', 'old_exam', 'instructor_rule', 'external_reference')",
            name="ck_documents_document_type",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    uploaded_by: Mapped[int | None] = mapped_column(Integer)
    file_name: Mapped[str] = mapped_column(String(255))
    stored_file_name: Mapped[str | None] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(20))
    document_type: Mapped[str] = mapped_column(String(50), default="lecture")
    mime_type: Mapped[str | None] = mapped_column(String(100))
    file_path: Mapped[str] = mapped_column(Text)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer)
    page_count: Mapped[int | None] = mapped_column(Integer)
    extracted_text: Mapped[str | None] = mapped_column(Text)
    text_length: Mapped[int | None] = mapped_column(Integer)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="uploaded", index=True)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    course = relationship("Course", back_populates="documents")
    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )
    questions = relationship("Question", back_populates="document")
