from sqlalchemy.orm import Session

from src.models.document import Document


def get_document(db: Session, document_id: int) -> Document | None:
    return db.get(Document, document_id)


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
