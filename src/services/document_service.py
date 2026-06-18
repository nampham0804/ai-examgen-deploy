from pathlib import Path
from uuid import uuid4

import fitz
from sqlalchemy.orm import Session

from src.models.document import Document
from src.repositories.course_repository import get_course
from src.repositories.document_repository import create_document

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_PDF_PAGES = 400
UPLOAD_DIR = Path("uploads")
SUPPORTED_EXTENSIONS = {".pdf", ".docx"}
SUPPORTED_DOCUMENT_TYPES = {
    "syllabus",
    "lecture",
    "old_exam",
    "instructor_rule",
    "external_reference",
}


class DocumentUploadError(Exception):
    def __init__(self, detail: str, status_code: int = 400, error: str = "Invalid upload") -> None:
        self.detail = detail
        self.status_code = status_code
        self.error = error


def upload_document(
    db: Session,
    *,
    course_id: int,
    original_filename: str,
    mime_type: str | None,
    file_bytes: bytes,
    document_type: str = "lecture",
) -> Document:
    if get_course(db, course_id) is None:
        raise DocumentUploadError("Course not found", status_code=404, error="Not found")

    normalized_document_type = document_type.strip() if document_type else "lecture"
    if normalized_document_type not in SUPPORTED_DOCUMENT_TYPES:
        raise DocumentUploadError("Unsupported document_type")

    file_name = Path(original_filename or "").name
    extension = Path(file_name).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise DocumentUploadError("Only PDF and DOCX files are supported")

    file_size_bytes = len(file_bytes)
    if file_size_bytes == 0:
        raise DocumentUploadError("Uploaded file is empty")
    if file_size_bytes > MAX_UPLOAD_BYTES:
        raise DocumentUploadError("File size exceeds the 15 MB limit")

    page_count = _read_pdf_page_count(file_bytes) if extension == ".pdf" else None
    if page_count is not None and page_count >= MAX_PDF_PAGES:
        raise DocumentUploadError("PDF page count must be less than 400 pages")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_file_name = f"{uuid4().hex}{extension}"
    stored_path = UPLOAD_DIR / stored_file_name
    stored_path.write_bytes(file_bytes)

    return create_document(
        db,
        course_id=course_id,
        uploaded_by=1,
        file_name=file_name,
        stored_file_name=stored_file_name,
        file_type=extension.removeprefix("."),
        document_type=normalized_document_type,
        mime_type=mime_type,
        file_path=stored_path.as_posix(),
        file_size_bytes=file_size_bytes,
        page_count=page_count,
    )


def _read_pdf_page_count(file_bytes: bytes) -> int | None:
    try:
        # PyMuPDF is used here only for upload-time PDF page count metadata.
        with fitz.open(stream=file_bytes, filetype="pdf") as pdf:
            return pdf.page_count
    except Exception:
        return None
