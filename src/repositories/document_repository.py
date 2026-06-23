from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from src.models.document import Document


def get_document(db: Session, document_id: int) -> Document | None:
    return db.get(Document, document_id)


def list_documents(
    db: Session,
    *,
    course_id: int | None = None,
    status: str | None = None,
    document_type: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Document], int]:
    filtered = _apply_filters(
        select(Document),
        course_id=course_id,
        status=status,
        document_type=document_type,
    )
    count_statement = _apply_filters(
        select(func.count()).select_from(Document),
        course_id=course_id,
        status=status,
        document_type=document_type,
    )
    statement = filtered.order_by(Document.created_at.desc(), Document.id.desc()).limit(limit).offset(offset)
    return list(db.scalars(statement).all()), db.scalar(count_statement) or 0


def create_document(
    db: Session,
    *,
    course_id: int,
    uploaded_by: int,
    file_name: str,
    stored_file_name: str,
    file_type: str,
    document_type: str,
    mime_type: str | None,
    file_path: str,
    file_size_bytes: int,
    page_count: int | None,
) -> Document:
    document = Document(
        course_id=course_id,
        uploaded_by=uploaded_by,
        file_name=file_name,
        stored_file_name=stored_file_name,
        file_type=file_type,
        document_type=document_type,
        mime_type=mime_type,
        file_path=file_path,
        file_size_bytes=file_size_bytes,
        page_count=page_count,
        status="uploaded",
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def _apply_filters(
    statement: Select,
    *,
    course_id: int | None,
    status: str | None,
    document_type: str | None,
) -> Select:
    if course_id is not None:
        statement = statement.where(Document.course_id == course_id)
    if status is not None:
        statement = statement.where(Document.status == status)
    if document_type is not None:
        statement = statement.where(Document.document_type == document_type)
    return statement
