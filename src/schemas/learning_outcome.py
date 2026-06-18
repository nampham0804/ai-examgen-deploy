from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field, model_validator


class LearningOutcomeBase(BaseModel):
    allowed_bloom_levels: ClassVar[set[str]] = {
        "remember",
        "understand",
        "apply",
        "analyze",
        "evaluate",
        "create",
    }

    code: str = Field(..., min_length=1, max_length=50)
    description: str = Field(..., min_length=1)
    bloom_level: str | None = None

    @model_validator(mode="after")
    def trim_values(self) -> "LearningOutcomeBase":
        self.code = self.code.strip()
        self.description = self.description.strip()
        if self.bloom_level is not None:
            self.bloom_level = self.bloom_level.strip().lower() or None
            if self.bloom_level is not None and self.bloom_level not in self.allowed_bloom_levels:
                raise ValueError("Invalid bloom level")
        return self


class LearningOutcomeCreate(LearningOutcomeBase):
    pass


class LearningOutcomeUpdate(BaseModel):
    allowed_bloom_levels: ClassVar[set[str]] = LearningOutcomeBase.allowed_bloom_levels

    code: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = Field(default=None, min_length=1)
    bloom_level: str | None = None

    @model_validator(mode="after")
    def validate_payload(self) -> "LearningOutcomeUpdate":
        if self.code is not None:
            self.code = self.code.strip()
        if self.description is not None:
            self.description = self.description.strip()
        if self.bloom_level is not None:
            self.bloom_level = self.bloom_level.strip().lower() or None
            if self.bloom_level is not None and self.bloom_level not in self.allowed_bloom_levels:
                raise ValueError("Invalid bloom level")
        if self.code is None and self.description is None and self.bloom_level is None:
            raise ValueError("At least one field must be provided")
        return self


class LearningOutcomeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    code: str
    description: str
    bloom_level: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
