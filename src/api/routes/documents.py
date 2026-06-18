from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.repositories.database import get_db
from src.repositories.document_chunk_repository import list_document_chunks
from src.repositories.document_repository import get_document
from src.schemas.document import DocumentExtractRead, DocumentRead, DocumentUploadRead
from src.schemas.document_chunk import DocumentChunkRead
from src.services.document_service import DocumentUploadError, upload_document
from src.services.extraction_service import DocumentExtractionError, extract_and_chunk_document

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def post_document_upload(
    file: UploadFile = File(...),
    course_id: int = Form(...),
    document_type: str = Form("lecture"),
    db: Session = Depends(get_db),
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


@router.get("/{document_id}")
def get_document_detail(document_id: int, db: Session = Depends(get_db)):
    document = get_document(db, document_id)
    if document is None:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Not found", "detail": "Document not found"},
        )

    return {"data": DocumentRead.model_validate(document), "message": "Document loaded"}


@router.post("/{document_id}/extract")
def post_document_extract(document_id: int, db: Session = Depends(get_db)):
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
def get_document_chunks(document_id: int, db: Session = Depends(get_db)):
    if get_document(db, document_id) is None:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Not found", "detail": "Document not found"},
        )

    chunks = [DocumentChunkRead.model_validate(chunk) for chunk in list_document_chunks(db, document_id)]
    return {"data": chunks, "message": "Document chunks loaded"}
