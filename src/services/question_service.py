from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.repositories import course_repository, question_repository
from src.schemas.question import QuestionBase, QuestionCreate, QuestionUpdate


def _ensure_course_exists(db: Session, course_id: int) -> None:
    if course_repository.get_course_by_id(db, course_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Not found", "detail": "Course not found"},
        )


def _validate_merged_question(question, payload: QuestionUpdate) -> None:
    update_data = payload.model_dump(exclude_unset=True)
    merged = {
        "question_type": update_data.get("question_type", question.question_type),
        "question_text": update_data.get("question_text", question.question_text),
        "difficulty": update_data.get("difficulty", question.difficulty),
        "options": update_data.get("options", question.options),
        "correct_answer": update_data.get("correct_answer", question.correct_answer),
        "suggested_answer": update_data.get("suggested_answer", question.suggested_answer),
        "grading_rubric": update_data.get("grading_rubric", question.grading_rubric),
        "explanation": update_data.get("explanation", question.explanation),
    }
    QuestionBase.model_validate(merged)


def list_questions(
    db: Session,
    *,
    status: str | None = None,
    course_id: int | None = None,
    document_id: int | None = None,
    learning_outcome_id: int | None = None,
    question_type: str | None = None,
    difficulty: str | None = None,
    page: int = 1,
    page_size: int = 20,
):
    return question_repository.get_questions(
        db,
        status=status,
        course_id=course_id,
        document_id=document_id,
        learning_outcome_id=learning_outcome_id,
        question_type=question_type,
        difficulty=difficulty,
        page=page,
        page_size=page_size,
    )


def get_question(db: Session, question_id: int):
    question = question_repository.get_question_by_id(db, question_id)
    if question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Not found", "detail": "Question not found"},
        )
    return question


def create_question(db: Session, payload: QuestionCreate, created_by: int = 1):
    _ensure_course_exists(db, payload.course_id)
    return question_repository.create_question(db, payload, created_by=created_by)


def update_question(db: Session, question_id: int, payload: QuestionUpdate):
    question = get_question(db, question_id)
    _validate_merged_question(question, payload)
    return question_repository.update_question(db, question, payload)


def approve_question(db: Session, question_id: int, approved_by: int = 1):
    question = get_question(db, question_id)
    return question_repository.approve_question(db, question, approved_by=approved_by)


def reject_question(db: Session, question_id: int):
    question = get_question(db, question_id)
    return question_repository.reject_question(db, question)
