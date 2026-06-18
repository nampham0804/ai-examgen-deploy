from datetime import datetime

from pydantic import BaseModel, Field


class BlueprintItemBase(BaseModel):
    learning_outcome_id: int
    question_type: str = Field(pattern="^(mcq|essay)$", description="Must be 'mcq' or 'essay'")
    easy_count: int = Field(default=0, ge=0)
    medium_count: int = Field(default=0, ge=0)
    hard_count: int = Field(default=0, ge=0)

class BlueprintItemCreate(BlueprintItemBase):
    pass

class BlueprintItemResponse(BlueprintItemBase):
    id: int
    blueprint_id: int

    class Config:
        from_attributes = True

class BlueprintBase(BaseModel):
    course_id: int
    title: str

class BlueprintCreate(BlueprintBase):
    items: list[BlueprintItemCreate]

class BlueprintUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    items: list[BlueprintItemCreate] | None = None

class BlueprintDataResponse(BlueprintBase):
    id: int
    total_questions: int
    status: str
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime
    items: list[BlueprintItemResponse] = []

    class Config:
        from_attributes = True

class BlueprintResponse(BaseModel):
    data: BlueprintDataResponse
    message: str

class BlueprintListResponse(BaseModel):
    data: list[BlueprintDataResponse]
    message: str

class ValidationDetail(BaseModel):
    learning_outcome_id: int
    learning_outcome_code: str
    question_type: str
    easy_required: int
    easy_available: int
    medium_required: int
    medium_available: int
    hard_required: int
    hard_available: int
    is_valid: bool
    missing: str | None = None

class ValidationResultData(BaseModel):
    is_valid: bool
    total_required: int
    details: list[ValidationDetail]

class ValidationResultResponse(BaseModel):
    data: ValidationResultData
    message: str
