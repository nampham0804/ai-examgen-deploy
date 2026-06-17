from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

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
    items: List[BlueprintItemCreate]

class BlueprintUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None

class BlueprintDataResponse(BlueprintBase):
    id: int
    total_questions: int
    status: str
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    items: List[BlueprintItemResponse] = []

    class Config:
        from_attributes = True

class BlueprintResponse(BaseModel):
    data: BlueprintDataResponse
    message: str

class BlueprintListResponse(BaseModel):
    data: List[BlueprintDataResponse]
    message: str
