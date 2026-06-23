from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentChunkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    course_id: int
    chunk_index: int
    title: str | None = None
    section_path: str | None = None
    text: str
    keywords: list[str] | None = None
    token_count: int | None = None
    page_start: int | None = None
    page_end: int | None = None
    created_at: datetime
