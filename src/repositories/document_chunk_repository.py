from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from src.models.document_chunk import DocumentChunk


def list_document_chunks(db: Session, document_id: int) -> list[DocumentChunk]:
    statement = (
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
    )
    return list(db.scalars(statement).all())


def delete_document_chunks(db: Session, document_id: int) -> None:
    db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document_id))


def create_document_chunks(
    db: Session,
    *,
    document_id: int,
    course_id: int,
    chunks: list[dict],
) -> list[DocumentChunk]:
    rows = [
        DocumentChunk(
            document_id=document_id,
            course_id=course_id,
            chunk_index=index,
            title=chunk["title"],
            section_path=chunk["section_path"],
            text=chunk["text"],
            keywords=chunk["keywords"],
            token_count=chunk["token_count"],
            page_start=None,
            page_end=None,
        )
        for index, chunk in enumerate(chunks)
    ]
    db.add_all(rows)
    return rows
