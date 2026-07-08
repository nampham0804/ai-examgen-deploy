from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.models.user import User
from src.repositories.document_chunk_repository import list_document_chunks
from src.repositories.document_repository import get_document, list_documents
from src.schemas.document import (
    DocumentExtractRead,
    DocumentListItemRead,
    DocumentListRead,
    DocumentRead,
    DocumentUploadRead,
)
from src.schemas.document_chunk import DocumentChunkRead
from src.services.document_service import DocumentUploadError, upload_document
from src.services.extraction_service import DocumentExtractionError, extract_and_chunk_document

router = APIRouter(prefix="/documents", tags=["documents"])

VALID_DOCUMENT_STATUSES = {"uploaded", "processing", "processed", "failed"}
VALID_DOCUMENT_TYPES = {"syllabus", "lecture", "old_exam", "instructor_rule", "external_reference"}
DEFAULT_LIMIT = 20
MAX_LIMIT = 100


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def post_document_upload(
    file: UploadFile = File(...),
    course_id: int = Form(...),
    document_type: str = Form("lecture"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_bytes = await file.read()
    try:
        document = upload_document(
            db,
            course_id=course_id,
            original_filename=file.filename or "",
            mime_type=file.content_type,
            file_bytes=file_bytes,
            document_type=document_type,
            uploaded_by=current_user.id,
        )
    except DocumentUploadError as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.error, "detail": exc.detail},
        )

    return {
        "data": DocumentUploadRead.model_validate(document),
        "message": "Upload successful",
    }


@router.get("")
def get_documents(
    course_id: int | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    document_type: str | None = None,
    limit: str | None = None,
    offset: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        parsed_limit, parsed_offset = _pagination(limit, offset)
    except ValueError as exc:
        return _validation_response(str(exc))
    if status_filter is not None and status_filter not in VALID_DOCUMENT_STATUSES:
        return _validation_response("status must be one of: uploaded, processing, processed, failed")
    if document_type is not None and document_type not in VALID_DOCUMENT_TYPES:
        return _validation_response(
            "document_type must be one of: syllabus, lecture, old_exam, instructor_rule, external_reference"
        )

    if course_id is not None:
        from src.repositories.course_repository import get_course
        course = get_course(db, course_id)
        if course is None or course.owner_id != current_user.id:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"error": "Not found", "detail": "Course not found"},
            )

    items, total = list_documents(
        db,
        course_id=course_id,
        status=status_filter,
        document_type=document_type,
        uploaded_by=current_user.id,
        limit=parsed_limit,
        offset=parsed_offset,
    )
    data = DocumentListRead(
        items=[DocumentListItemRead.model_validate(document) for document in items],
        total=total,
        limit=parsed_limit,
        offset=parsed_offset,
    )
    return {"data": data, "message": "Documents retrieved"}


@router.get("/{document_id}")
def get_document_detail(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = get_document(db, document_id)
    if document is None or document.uploaded_by != current_user.id:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Not found", "detail": "Document not found"},
        )

    return {"data": DocumentRead.model_validate(document), "message": "Document loaded"}


@router.post("/{document_id}/extract")
def post_document_extract(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = get_document(db, document_id)
    if document is None or document.uploaded_by != current_user.id:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Not found", "detail": "Document not found"},
        )

    try:
        document = extract_and_chunk_document(db, document_id)
    except DocumentExtractionError as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.error, "detail": exc.detail},
        )

    return {
        "data": DocumentExtractRead.model_validate(document),
        "message": "Extract and chunk successful",
    }


@router.get("/{document_id}/chunks")
def get_document_chunks(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = get_document(db, document_id)
    if document is None or document.uploaded_by != current_user.id:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Not found", "detail": "Document not found"},
        )

    chunks = [DocumentChunkRead.model_validate(chunk) for chunk in list_document_chunks(db, document_id)]
    return {"data": chunks, "message": "Document chunks loaded"}


def _pagination(limit: str | None, offset: str | None) -> tuple[int, int]:
    parsed_limit = _parse_int(limit or str(DEFAULT_LIMIT), "limit")
    parsed_offset = _parse_int(offset or "0", "offset")
    if parsed_limit < 1 or parsed_limit > MAX_LIMIT:
        raise _validation_exception("limit must be between 1 and 100")
    if parsed_offset < 0:
        raise _validation_exception("offset must be greater than or equal to 0")
    return parsed_limit, parsed_offset


def _parse_int(value: str, field_name: str) -> int:
    try:
        return int(value)
    except ValueError as exc:
        raise _validation_exception(f"{field_name} must be an integer") from exc


def _validation_exception(detail: str) -> ValueError:
    return ValueError(detail)


def _validation_response(detail: str) -> JSONResponse:
    return JSONResponse(status_code=400, content={"error": "Invalid request", "detail": detail})
