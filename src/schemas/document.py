from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

DocumentType = Literal["syllabus", "lecture", "old_exam", "instructor_rule", "external_reference"]


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    uploaded_by: int | None = None
    file_name: str
    stored_file_name: str | None = None
    file_type: str
    document_type: DocumentType
    mime_type: str | None = None
    file_path: str
    file_size_bytes: int | None = None
    page_count: int | None = None
    text_length: int | None = None
    chunk_count: int
    status: str
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


class DocumentUploadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    file_name: str
    file_type: str
    document_type: DocumentType
    file_size_bytes: int
    page_count: int | None = None
    status: str


class DocumentExtractRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    text_length: int
    chunk_count: int
    extraction_method: str = "markitdown"
