from pathlib import Path

from markitdown import MarkItDown
from sqlalchemy.orm import Session

from src.models.document import Document
from src.repositories.document_chunk_repository import (
    create_document_chunks,
    delete_document_chunks,
)
from src.repositories.document_repository import get_document
from src.services.chunking_service import chunk_text

MIN_EXTRACTED_TEXT_CHARS = 20
EXTRACTION_METHOD = "markitdown"


class DocumentExtractionError(Exception):
    def __init__(self, detail: str, status_code: int = 400, error: str = "Extraction failed") -> None:
        self.detail = detail
        self.status_code = status_code
        self.error = error


def extract_and_chunk_document(db: Session, document_id: int) -> Document:
    document = get_document(db, document_id)
    if document is None:
        raise DocumentExtractionError("Document not found", status_code=404, error="Not found")

    file_path = Path(document.file_path)
    if not file_path.exists():
        _mark_failed(db, document, "Uploaded file not found on disk")
        raise DocumentExtractionError("Uploaded file not found on disk", status_code=404, error="Not found")

    document.status = "processing"
    document.error_message = None
    db.commit()
    db.refresh(document)

    try:
        extracted_text = _extract_text_with_markitdown(file_path)
        if len(extracted_text) < MIN_EXTRACTED_TEXT_CHARS:
            _mark_failed(db, document, "Extracted text is empty or too short")
            raise DocumentExtractionError("Extracted text is empty or too short")

        chunks = chunk_text(extracted_text)
        if not chunks:
            _mark_failed(db, document, "No chunks could be created from extracted text")
            raise DocumentExtractionError("No chunks could be created from extracted text")

        delete_document_chunks(db, document.id)
        create_document_chunks(
            db,
            document_id=document.id,
            course_id=document.course_id,
            chunks=chunks,
        )

        document.extracted_text = extracted_text
        document.text_length = len(extracted_text)
        document.chunk_count = len(chunks)
        document.status = "processed"
        document.error_message = None
        db.commit()
        db.refresh(document)
        return document
    except DocumentExtractionError:
        raise
    except Exception as exc:
        detail = f"MarkItDown extraction failed: {exc}"
        _mark_failed(db, document, detail)
        raise DocumentExtractionError(detail) from exc


def _extract_text_with_markitdown(file_path: Path) -> str:
    converter = MarkItDown()
    result = converter.convert(str(file_path))
    return (result.text_content or "").strip()


def _mark_failed(db: Session, document: Document, error_message: str) -> None:
    document.status = "failed"
    document.error_message = error_message
    db.commit()
    db.refresh(document)
