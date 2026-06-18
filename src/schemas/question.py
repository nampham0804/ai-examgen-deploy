from datetime import datetime
from typing import ClassVar, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

QuestionType = Literal["mcq", "essay"]
QuestionDifficulty = Literal["easy", "medium", "hard"]
QuestionStatus = Literal["pending_review", "approved", "rejected"]
OptionKey = Literal["A", "B", "C", "D"]


class QuestionOption(BaseModel):
    key: OptionKey
    text: str = Field(..., min_length=1)

    @model_validator(mode="after")
    def trim_values(self) -> "QuestionOption":
        self.text = self.text.strip()
        if not self.text:
            raise ValueError("Option text is required")
        return self


class QuestionBase(BaseModel):
    allowed_option_keys: ClassVar[set[str]] = {"A", "B", "C", "D"}

    question_type: QuestionType = "mcq"
    question_text: str = Field(..., min_length=1)
    difficulty: QuestionDifficulty
    options: list[QuestionOption] | None = None
    correct_answer: OptionKey | None = None
    suggested_answer: str | None = None
    grading_rubric: str | None = None
    explanation: str | None = None

    @model_validator(mode="after")
    def validate_question_shape(self) -> "QuestionBase":
        self.question_text = self.question_text.strip()
        self.suggested_answer = self.suggested_answer.strip() if self.suggested_answer else None
        self.grading_rubric = self.grading_rubric.strip() if self.grading_rubric else None
        self.explanation = self.explanation.strip() if self.explanation else None

        if self.question_type == "mcq":
            if self.options is None or len(self.options) != 4:
                raise ValueError("MCQ questions must have exactly 4 options")
            option_keys = {option.key for option in self.options}
            if option_keys != self.allowed_option_keys:
                raise ValueError("MCQ options must use keys A, B, C, and D")
            if self.correct_answer not in self.allowed_option_keys:
                raise ValueError("MCQ questions must have a correct answer A, B, C, or D")

        if self.question_type == "essay":
            self.options = None
            self.correct_answer = None
            if not self.suggested_answer and not self.grading_rubric:
                raise ValueError("Essay questions need a suggested answer or grading rubric")

        return self


class QuestionCreate(QuestionBase):
    course_id: int
    learning_outcome_id: int
    document_id: int | None = None
    status: QuestionStatus = "pending_review"
    created_by_ai: bool = True


class QuestionUpdate(BaseModel):
    question_type: QuestionType | None = None
    question_text: str | None = Field(default=None, min_length=1)
    difficulty: QuestionDifficulty | None = None
    options: list[QuestionOption] | None = None
    correct_answer: OptionKey | None = None
    suggested_answer: str | None = None
    grading_rubric: str | None = None
    explanation: str | None = None

    @model_validator(mode="after")
    def trim_values(self) -> "QuestionUpdate":
        if self.question_text is not None:
            self.question_text = self.question_text.strip()
        if self.suggested_answer is not None:
            self.suggested_answer = self.suggested_answer.strip() or None
        if self.grading_rubric is not None:
            self.grading_rubric = self.grading_rubric.strip() or None
        if self.explanation is not None:
            self.explanation = self.explanation.strip() or None
        if not self.model_dump(exclude_unset=True):
            raise ValueError("At least one field must be provided")
        return self


class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    learning_outcome_id: int
    document_id: int | None = None
    question_type: str
    question_text: str
    difficulty: str
    options: list[QuestionOption] | None = None
    correct_answer: str | None = None
    suggested_answer: str | None = None
    grading_rubric: str | None = None
    explanation: str | None = None
    status: str
    created_by_ai: bool
    created_by: int | None = None
    approved_by: int | None = None
    approved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None


class QuestionListResponse(BaseModel):
    items: list[QuestionResponse]
    total: int
    page: int
    page_size: int
