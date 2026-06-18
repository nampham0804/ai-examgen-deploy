from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.api.deps import get_db
from src.schemas.question import (
    QuestionCreate,
    QuestionListResponse,
    QuestionResponse,
    QuestionUpdate,
)
from src.services import question_service

router = APIRouter()


@router.get("", response_model=dict)
def list_questions(
    status_filter: Literal["pending_review", "approved", "rejected"] | None = Query(default=None, alias="status"),
    course_id: int | None = None,
    learning_outcome_id: int | None = None,
    question_type: Literal["mcq", "essay"] | None = None,
    difficulty: Literal["easy", "medium", "hard"] | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    questions, total = question_service.list_questions(
        db,
        status=status_filter,
        course_id=course_id,
        learning_outcome_id=learning_outcome_id,
        question_type=question_type,
        difficulty=difficulty,
        page=page,
        page_size=page_size,
    )
    return {
        "data": QuestionListResponse(
            items=[QuestionResponse.model_validate(question) for question in questions],
            total=total,
            page=page,
            page_size=page_size,
        ),
        "message": "Questions loaded",
    }


@router.post("", status_code=status.HTTP_201_CREATED, response_model=dict)
def create_question(payload: QuestionCreate, db: Session = Depends(get_db)):
    question = question_service.create_question(db, payload)
    return {
        "data": QuestionResponse.model_validate(question),
        "message": "Question created",
    }


@router.get("/{question_id}", response_model=dict)
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = question_service.get_question(db, question_id)
    return {
        "data": QuestionResponse.model_validate(question),
        "message": "Question loaded",
    }


@router.put("/{question_id}", response_model=dict)
def update_question(question_id: int, payload: QuestionUpdate, db: Session = Depends(get_db)):
    question = question_service.update_question(db, question_id, payload)
    return {
        "data": QuestionResponse.model_validate(question),
        "message": "Question updated",
    }


@router.post("/{question_id}/approve", response_model=dict)
def approve_question(question_id: int, db: Session = Depends(get_db)):
    question = question_service.approve_question(db, question_id)
    return {
        "data": QuestionResponse.model_validate(question),
        "message": "Question approved",
    }


@router.post("/{question_id}/reject", response_model=dict)
def reject_question(question_id: int, db: Session = Depends(get_db)):
    question = question_service.reject_question(db, question_id)
    return {
        "data": QuestionResponse.model_validate(question),
        "message": "Question rejected",
    }
