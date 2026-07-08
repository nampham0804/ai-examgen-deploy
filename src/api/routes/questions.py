from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.models.user import User
from src.schemas.question import (
    QuestionCreate,
    QuestionListItemRead,
    QuestionListRead,
    QuestionListResponse,
    QuestionRead,
    QuestionResponse,
    QuestionUpdate,
)
from src.services import question_service

router = APIRouter(prefix="/questions", tags=["questions"])

VALID_STATUSES = {"pending_review", "approved", "rejected"}
VALID_QUESTION_TYPES = {"mcq", "essay"}
VALID_DIFFICULTIES = {"easy", "medium", "hard"}
DEFAULT_LIMIT = 20
MAX_LIMIT = 100


@router.get("")
def get_questions(
    course_id: int | None = None,
    document_id: int | None = None,
    learning_outcome_id: int | None = None,
    status_filter: Literal["pending_review", "approved", "rejected"] | None = Query(default=None, alias="status"),
    question_type: Literal["mcq", "essay"] | None = None,
    difficulty: Literal["easy", "medium", "hard"] | None = None,
    limit: str | None = None,
    offset: str | None = None,
    page: int | None = Query(default=None, ge=1),
    page_size: int | None = Query(default=None, ge=1, le=MAX_LIMIT),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parsed_limit, parsed_offset = _pagination(limit, offset, page, page_size)
    items, total = question_service.list_questions(
        db,
        status_filter=status_filter,
        course_id=course_id,
        document_id=document_id,
        learning_outcome_id=learning_outcome_id,
        question_type=question_type,
        difficulty=difficulty,
        page=(parsed_offset // parsed_limit) + 1,
        page_size=parsed_limit,
        user_id=current_user.id,
    )

    if page is not None or page_size is not None:
        data = QuestionListResponse(
            items=[QuestionResponse.model_validate(question) for question in items],
            total=total,
            page=(parsed_offset // parsed_limit) + 1,
            page_size=parsed_limit,
        )
        return {"data": data, "message": "Questions loaded"}

    data = QuestionListRead(
        items=[QuestionListItemRead.model_validate(question) for question in items],
        total=total,
        limit=parsed_limit,
        offset=parsed_offset,
    )
    return {"data": data, "message": "Questions retrieved"}


@router.post("", status_code=status.HTTP_201_CREATED, response_model=dict)
def create_question(payload: QuestionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    question = question_service.create_question(db, payload, current_user.id)
    return {
        "data": QuestionResponse.model_validate(question),
        "message": "Question created",
    }


@router.get("/{question_id}", response_model=dict)
def get_question_detail(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    question = question_service.get_question(db, question_id, current_user.id)
    return {
        "data": QuestionRead.model_validate(question),
        "message": "Question retrieved",
    }


@router.put("/{question_id}", response_model=dict)
def update_question(question_id: int, payload: QuestionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    question = question_service.update_question(db, question_id, payload, current_user.id)
    return {
        "data": QuestionResponse.model_validate(question),
        "message": "Question updated",
    }


@router.post("/{question_id}/approve", response_model=dict)
def approve_question(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    question = question_service.approve_question(db, question_id, current_user.id)
    return {
        "data": QuestionResponse.model_validate(question),
        "message": "Question approved",
    }


@router.post("/{question_id}/reject", response_model=dict)
def reject_question(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    question = question_service.reject_question(db, question_id, current_user.id)
    return {
        "data": QuestionResponse.model_validate(question),
        "message": "Question rejected",
    }


def _pagination(
    limit: str | None,
    offset: str | None,
    page: int | None,
    page_size: int | None,
) -> tuple[int, int]:
    if page is not None or page_size is not None:
        parsed_limit = page_size or DEFAULT_LIMIT
        parsed_page = page or 1
        return parsed_limit, (parsed_page - 1) * parsed_limit

    parsed_limit = _parse_int(limit or str(DEFAULT_LIMIT), "limit")
    parsed_offset = _parse_int(offset or "0", "offset")
    if parsed_limit < 1 or parsed_limit > MAX_LIMIT:
        raise _validation_error("limit must be between 1 and 100")
    if parsed_offset < 0:
        raise _validation_error("offset must be greater than or equal to 0")
    return parsed_limit, parsed_offset


def _parse_int(value: str, field_name: str) -> int:
    try:
        return int(value)
    except ValueError as exc:
        raise _validation_error(f"{field_name} must be an integer") from exc


def _validation_error(detail: str) -> HTTPException:
    return HTTPException(
        status_code=400,
        detail={"error": "Invalid request", "detail": detail},
    )
