from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.repositories.database import Base


class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    __table_args__ = (UniqueConstraint("document_id", "chunk_index", name="uq_document_chunks_index"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    chunk_index: Mapped[int] = mapped_column(Integer)
    title: Mapped[str | None] = mapped_column(String(255))
    section_path: Mapped[str | None] = mapped_column(Text)
    text: Mapped[str] = mapped_column(Text)
    keywords: Mapped[list[str] | None] = mapped_column(JSON)
    token_count: Mapped[int | None] = mapped_column(Integer)
    page_start: Mapped[int | None] = mapped_column(Integer)
    page_end: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    document = relationship("Document", back_populates="chunks")
    course = relationship("Course")
