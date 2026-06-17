from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CourseCreate(BaseModel):
    code: str
    name: str
    description: str | None = None


class CourseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    description: str | None = None
    created_at: datetime
    updated_at: datetime
