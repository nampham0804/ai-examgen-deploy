from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.repositories.database import get_db
from src.repositories.question_repository import get_question, list_questions
from src.schemas.question import QuestionListItemRead, QuestionListRead, QuestionRead

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
    status: str | None = None,
    question_type: str | None = None,
    difficulty: str | None = None,
    limit: str = str(DEFAULT_LIMIT),
    offset: str = "0",
    db: Session = Depends(get_db),
):
    pagination = _parse_pagination(limit, offset)
    if isinstance(pagination, JSONResponse):
        return pagination
    parsed_limit, parsed_offset = pagination

    validation_error = _validate_filters(status, question_type, difficulty)
    if validation_error is not None:
        return validation_error

    items, total = list_questions(
        db,
        course_id=course_id,
        document_id=document_id,
        learning_outcome_id=learning_outcome_id,
        status=status,
        question_type=question_type,
        difficulty=difficulty,
        limit=parsed_limit,
        offset=parsed_offset,
    )
    data = QuestionListRead(
        items=[QuestionListItemRead.model_validate(question) for question in items],
        total=total,
        limit=parsed_limit,
        offset=parsed_offset,
    )
    return {"data": data, "message": "Questions retrieved"}


@router.get("/{question_id}")
def get_question_detail(question_id: int, db: Session = Depends(get_db)):
    question = get_question(db, question_id)
    if question is None:
        return JSONResponse(
            status_code=404,
            content={"error": "Not found", "detail": "Question not found"},
        )

    return {
        "data": QuestionRead.model_validate(question),
        "message": "Question retrieved",
    }


def _validate_filters(
    status: str | None,
    question_type: str | None,
    difficulty: str | None,
) -> JSONResponse | None:
    if status is not None and status not in VALID_STATUSES:
        return _validation_error("status must be one of: pending_review, approved, rejected")
    if question_type is not None and question_type not in VALID_QUESTION_TYPES:
        return _validation_error("question_type must be one of: mcq, essay")
    if difficulty is not None and difficulty not in VALID_DIFFICULTIES:
        return _validation_error("difficulty must be one of: easy, medium, hard")
    return None


def _parse_pagination(limit: str, offset: str) -> tuple[int, int] | JSONResponse:
    try:
        parsed_limit = int(limit)
    except ValueError:
        return _validation_error("limit must be an integer between 1 and 100")
    try:
        parsed_offset = int(offset)
    except ValueError:
        return _validation_error("offset must be an integer greater than or equal to 0")

    if parsed_limit < 1 or parsed_limit > MAX_LIMIT:
        return _validation_error("limit must be between 1 and 100")
    if parsed_offset < 0:
        return _validation_error("offset must be greater than or equal to 0")
    return parsed_limit, parsed_offset


def _validation_error(detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"error": "Invalid request", "detail": detail},
    )
