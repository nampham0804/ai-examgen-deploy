from pydantic import BaseModel, Field


class ChunkRetrievalRequest(BaseModel):
    document_id: int
    learning_outcome_id: int
    topic: str | None = None
    top_k: int = Field(default=5, ge=1)
    extra_keywords: list[str] | None = None


class RetrievedChunkRead(BaseModel):
    chunk_id: int
    chunk_index: int
    title: str | None = None
    section_path: str | None = None
    score: float
    keywords: list[str] | None = None
    text_preview: str
    match_reason: list[str]


class ChunkRetrievalRead(BaseModel):
    document_id: int
    learning_outcome_id: int
    topic: str | None = None
    top_k: int
    chunks: list[RetrievedChunkRead]
