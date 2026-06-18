from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models.question import Question
from src.schemas.question import QuestionCreate, QuestionUpdate


def get_questions(
    db: Session,
    *,
    status: str | None = None,
    course_id: int | None = None,
    learning_outcome_id: int | None = None,
    question_type: str | None = None,
    difficulty: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Question], int]:
    statement = select(Question)

    if status:
        statement = statement.where(Question.status == status)
    if course_id:
        statement = statement.where(Question.course_id == course_id)
    if learning_outcome_id:
        statement = statement.where(Question.learning_outcome_id == learning_outcome_id)
    if question_type:
        statement = statement.where(Question.question_type == question_type)
    if difficulty:
        statement = statement.where(Question.difficulty == difficulty)

    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    items = list(
        db.scalars(
            statement.order_by(Question.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )
    return items, total


def get_question_by_id(db: Session, question_id: int) -> Question | None:
    return db.get(Question, question_id)


def create_question(db: Session, payload: QuestionCreate, created_by: int = 1) -> Question:
    question = Question(
        course_id=payload.course_id,
        learning_outcome_id=payload.learning_outcome_id,
        document_id=payload.document_id,
        question_type=payload.question_type,
        question_text=payload.question_text,
        difficulty=payload.difficulty,
        options=[option.model_dump() for option in payload.options] if payload.options else None,
        correct_answer=payload.correct_answer,
        suggested_answer=payload.suggested_answer,
        grading_rubric=payload.grading_rubric,
        explanation=payload.explanation,
        status=payload.status,
        created_by_ai=payload.created_by_ai,
        created_by=created_by,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


def update_question(db: Session, question: Question, payload: QuestionUpdate) -> Question:
    update_data = payload.model_dump(exclude_unset=True)
    if "options" in update_data and update_data["options"] is not None:
        update_data["options"] = [option.model_dump() for option in payload.options or []]
    for field, value in update_data.items():
        setattr(question, field, value)
    db.commit()
    db.refresh(question)
    return question


def approve_question(db: Session, question: Question, approved_by: int = 1) -> Question:
    question.status = "approved"
    question.approved_by = approved_by
    question.approved_at = datetime.now(UTC).replace(tzinfo=None)
    db.commit()
    db.refresh(question)
    return question


def reject_question(db: Session, question: Question) -> Question:
    question.status = "rejected"
    question.approved_by = None
    question.approved_at = None
    db.commit()
    db.refresh(question)
    return question
