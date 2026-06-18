from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

QuestionType = Literal["mcq", "essay"]
Difficulty = Literal["easy", "medium", "hard"]
QuestionStatus = Literal["pending_review", "approved", "rejected"]


class QuestionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    learning_outcome_id: int
    document_id: int | None = None
    question_type: QuestionType
    difficulty: Difficulty
    question_text: str
    options: list[dict[str, str]] | None = None
    correct_answer: str | None = None
    suggested_answer: str | None = None
    grading_rubric: str | None = None
    explanation: str | None = None
    status: QuestionStatus
    created_by_ai: bool
    created_by: int | None = None
    source_chunk_ids: list[int] | None = None
    generation_topic: str | None = None
    created_at: datetime
    updated_at: datetime
