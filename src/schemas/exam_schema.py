from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ExamQuestionBase(BaseModel):
    question_id: int
    order_index: int

class ExamQuestionResponse(ExamQuestionBase):
    id: int
    exam_id: int

    class Config:
        from_attributes = True

class ExamBase(BaseModel):
    course_id: int
    title: str
    duration_minutes: int
    blueprint_id: Optional[int] = None

class ExamCreate(ExamBase):
    pass

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None

class ExamDataResponse(ExamBase):
    id: int
    total_questions: int
    status: str
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    questions: List[ExamQuestionResponse] = []

    class Config:
        from_attributes = True

class ExamResponse(BaseModel):
    data: ExamDataResponse
    message: str

class ExamListResponse(BaseModel):
    data: List[ExamDataResponse]
    message: str

class ExamPreviewQuestion(BaseModel):
    id: int
    exam_id: int
    question_id: int
    order_index: int
    text: str
    type: str
    difficulty: str
    learning_outcome_code: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    sample_answer: Optional[str] = None
    rubric: Optional[str] = None

class ExamPreviewData(BaseModel):
    id: int
    title: str
    course_name: str
    duration_minutes: int
    total_questions: int
    questions: List[ExamPreviewQuestion]

class ExamPreviewResponse(BaseModel):
    data: ExamPreviewData
    message: str
