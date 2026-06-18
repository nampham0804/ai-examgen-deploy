from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.api.deps import get_db
from src.schemas.learning_outcome import (
    LearningOutcomeCreate,
    LearningOutcomeResponse,
    LearningOutcomeUpdate,
)
from src.services import learning_outcome_service

router = APIRouter()


@router.get("/courses/{course_id}/learning-outcomes", response_model=dict)
def list_learning_outcomes(course_id: int, db: Session = Depends(get_db)):
    learning_outcomes = learning_outcome_service.list_learning_outcomes(db, course_id)
    return {
        "data": [LearningOutcomeResponse.model_validate(item) for item in learning_outcomes],
        "message": "Learning outcomes loaded",
    }


@router.post(
    "/courses/{course_id}/learning-outcomes",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
def create_learning_outcome(
    course_id: int,
    payload: LearningOutcomeCreate,
    db: Session = Depends(get_db),
):
    learning_outcome = learning_outcome_service.create_learning_outcome(db, course_id, payload)
    return {
        "data": LearningOutcomeResponse.model_validate(learning_outcome),
        "message": "Learning outcome created",
    }


@router.put("/learning-outcomes/{learning_outcome_id}", response_model=dict)
def update_learning_outcome(
    learning_outcome_id: int,
    payload: LearningOutcomeUpdate,
    db: Session = Depends(get_db),
):
    learning_outcome = learning_outcome_service.update_learning_outcome(db, learning_outcome_id, payload)
    return {
        "data": LearningOutcomeResponse.model_validate(learning_outcome),
        "message": "Learning outcome updated",
    }


@router.delete("/learning-outcomes/{learning_outcome_id}", response_model=dict)
def delete_learning_outcome(learning_outcome_id: int, db: Session = Depends(get_db)):
    learning_outcome_service.delete_learning_outcome(db, learning_outcome_id)
    return {
        "data": {"id": learning_outcome_id},
        "message": "Learning outcome deleted",
    }
