from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CourseBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None

    @model_validator(mode="after")
    def trim_values(self) -> "CourseBase":
        self.code = self.code.strip()
        self.name = self.name.strip()
        if self.description is not None:
            self.description = self.description.strip() or None
        return self


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None

    @model_validator(mode="after")
    def validate_payload(self) -> "CourseUpdate":
        if self.code is not None:
            self.code = self.code.strip()
        if self.name is not None:
            self.name = self.name.strip()
        if self.description is not None:
            self.description = self.description.strip() or None
        if self.code is None and self.name is None and self.description is None:
            raise ValueError("At least one field must be provided")
        return self


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    description: str | None = None
    owner_id: int | None = None
    created_at: datetime
    updated_at: datetime | None = None
