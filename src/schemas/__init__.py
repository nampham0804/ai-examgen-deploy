"""Pydantic schemas live here."""

from src.schemas.course import CourseCreate, CourseRead
from src.schemas.document import DocumentExtractRead, DocumentRead, DocumentUploadRead
from src.schemas.document_chunk import DocumentChunkRead
from src.schemas.learning_outcome import LearningOutcomeCreate, LearningOutcomeRead
from src.schemas.question import QuestionRead

__all__ = [
    "CourseCreate",
    "CourseRead",
    "DocumentChunkRead",
    "DocumentExtractRead",
    "DocumentRead",
    "DocumentUploadRead",
    "LearningOutcomeCreate",
    "LearningOutcomeRead",
    "QuestionRead",
]
