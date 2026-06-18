from typing import Any

from pydantic import BaseModel


class SuccessResponse(BaseModel):
    data: Any
    message: str


class ErrorResponse(BaseModel):
    error: str
    detail: str
