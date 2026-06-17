from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LearningOutcomeCreate(BaseModel):
    code: str
    description: str
    bloom_level: str | None = None


class LearningOutcomeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    code: str
    description: str
    bloom_level: str | None = None
    created_at: datetime
    updated_at: datetime
