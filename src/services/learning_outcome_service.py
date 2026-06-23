from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.repositories import course_repository, learning_outcome_repository
from src.schemas.learning_outcome import LearningOutcomeCreate, LearningOutcomeUpdate


def _ensure_course_exists(db: Session, course_id: int) -> None:
    if course_repository.get_course_by_id(db, course_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Not found", "detail": "Course not found"},
        )


def list_learning_outcomes(db: Session, course_id: int):
    _ensure_course_exists(db, course_id)
    return learning_outcome_repository.get_learning_outcomes_by_course(db, course_id)


def get_learning_outcome(db: Session, learning_outcome_id: int):
    learning_outcome = learning_outcome_repository.get_learning_outcome_by_id(db, learning_outcome_id)
    if learning_outcome is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Not found", "detail": "Learning outcome not found"},
        )
    return learning_outcome


def create_learning_outcome(db: Session, course_id: int, payload: LearningOutcomeCreate):
    _ensure_course_exists(db, course_id)
    existing = learning_outcome_repository.get_learning_outcome_by_course_and_code(db, course_id, payload.code)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "Conflict", "detail": "Learning outcome code already exists in this course"},
        )
    return learning_outcome_repository.create_learning_outcome(db, course_id, payload)


def update_learning_outcome(db: Session, learning_outcome_id: int, payload: LearningOutcomeUpdate):
    learning_outcome = get_learning_outcome(db, learning_outcome_id)
    if payload.code is not None:
        existing = learning_outcome_repository.get_learning_outcome_by_course_and_code(
            db,
            learning_outcome.course_id,
            payload.code,
        )
        if existing is not None and existing.id != learning_outcome_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": "Conflict", "detail": "Learning outcome code already exists in this course"},
            )
    return learning_outcome_repository.update_learning_outcome(db, learning_outcome, payload)


def delete_learning_outcome(db: Session, learning_outcome_id: int) -> None:
    learning_outcome = get_learning_outcome(db, learning_outcome_id)
    learning_outcome_repository.delete_learning_outcome(db, learning_outcome)
