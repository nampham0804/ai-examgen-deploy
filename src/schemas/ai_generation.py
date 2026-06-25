from pydantic import BaseModel, Field

from src.schemas.question import QuestionRead


class QuestionGenerationRequest(BaseModel):
    document_id: int
    learning_outcome_id: int
    question_type: str
    difficulty: str
    num_questions: int = Field(default=3, ge=1, le=5)
    topic: str | None = None
    top_k: int = 5
    diversity_mode: bool = True


class QuestionGenerationRead(BaseModel):
    generated: int
    document_id: int
    learning_outcome_id: int
    source_chunk_ids: list[int]
    warnings: list[str]
    questions: list[QuestionRead]
