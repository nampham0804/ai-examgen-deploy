from pydantic import BaseModel, Field, model_validator

from src.schemas.question import QuestionRead


class QuestionGenerationRequest(BaseModel):
    document_id: int | None = None
    document_ids: list[int] | None = None
    learning_outcome_id: int
    question_type: str
    difficulty: str
    num_questions: int = Field(default=3, ge=1, le=5)
    topic: str | None = None
    top_k: int = 5
    diversity_mode: bool = True

    @model_validator(mode="after")
    def require_document_selection(self) -> "QuestionGenerationRequest":
        if self.document_id is None and not self.document_ids:
            raise ValueError("document_id or document_ids is required")
        if self.document_ids is not None and len(self.document_ids) == 0:
            raise ValueError("document_ids must not be empty")
        return self


class QuestionGenerationRead(BaseModel):
    generated: int
    document_id: int | None = None
    document_ids: list[int] | None = None
    learning_outcome_id: int
    source_chunk_ids: list[int]
    warnings: list[str]
    questions: list[QuestionRead]
