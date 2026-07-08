from datetime import datetime

from pydantic import BaseModel


class ExamQuestionBase(BaseModel):
    question_id: int | None = None
    order_index: int
    criteria_id: int | None = None

class ExamQuestionResponse(ExamQuestionBase):
    id: int
    exam_id: int

    class Config:
        from_attributes = True

class ExamBase(BaseModel):
    course_id: int
    title: str
    duration_minutes: int
    blueprint_id: int | None = None

class ExamCreate(ExamBase):
    pass

class ExamUpdate(BaseModel):
    title: str | None = None
    duration_minutes: int | None = None
    status: str | None = None

class ExamDataResponse(ExamBase):
    id: int
    total_questions: int
    status: str
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime
    course_name: str | None = None
    blueprint_name: str | None = None
    questions: list[ExamQuestionResponse] = []

    class Config:
        from_attributes = True

class ExamResponse(BaseModel):
    data: ExamDataResponse
    message: str

class ExamListResponse(BaseModel):
    data: list[ExamDataResponse]
    message: str

class ExamPreviewQuestion(BaseModel):
    id: int
    exam_id: int
    question_id: int | None = None
    order_index: int
    text: str
    type: str
    difficulty: str
    learning_outcome_code: str
    options: list[str] | None = None
    correct_answer: str | None = None
    sample_answer: str | None = None
    rubric: str | None = None
    explanation: str | None = None

class ExamPreviewData(BaseModel):
    id: int
    title: str
    course_name: str
    duration_minutes: int
    total_questions: int
    status: str
    questions: list[ExamPreviewQuestion]

class ExamPreviewResponse(BaseModel):
    data: ExamPreviewData
    message: str

class ExamReorderItem(BaseModel):
    id: int
    order_index: int

class ExamReorderRequest(BaseModel):
    items: list[ExamReorderItem]
