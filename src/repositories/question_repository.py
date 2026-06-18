from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from src.models.question import Question


def create_questions(db: Session, questions: list[dict]) -> list[Question]:
    rows = [Question(**question) for question in questions]
    db.add_all(rows)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows


def get_question(db: Session, question_id: int) -> Question | None:
    return db.get(Question, question_id)


def list_questions(
    db: Session,
    *,
    course_id: int | None = None,
    document_id: int | None = None,
    learning_outcome_id: int | None = None,
    status: str | None = None,
    question_type: str | None = None,
    difficulty: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Question], int]:
    filtered = _apply_filters(
        select(Question),
        course_id=course_id,
        document_id=document_id,
        learning_outcome_id=learning_outcome_id,
        status=status,
        question_type=question_type,
        difficulty=difficulty,
    )
    count_statement = _apply_filters(
        select(func.count()).select_from(Question),
        course_id=course_id,
        document_id=document_id,
        learning_outcome_id=learning_outcome_id,
        status=status,
        question_type=question_type,
        difficulty=difficulty,
    )
    statement = filtered.order_by(Question.created_at.desc(), Question.id.desc()).limit(limit).offset(offset)
    return list(db.scalars(statement).all()), db.scalar(count_statement) or 0


def _apply_filters(
    statement: Select,
    *,
    course_id: int | None,
    document_id: int | None,
    learning_outcome_id: int | None,
    status: str | None,
    question_type: str | None,
    difficulty: str | None,
) -> Select:
    if course_id is not None:
        statement = statement.where(Question.course_id == course_id)
    if document_id is not None:
        statement = statement.where(Question.document_id == document_id)
    if learning_outcome_id is not None:
        statement = statement.where(Question.learning_outcome_id == learning_outcome_id)
    if status is not None:
        statement = statement.where(Question.status == status)
    if question_type is not None:
        statement = statement.where(Question.question_type == question_type)
    if difficulty is not None:
        statement = statement.where(Question.difficulty == difficulty)
    return statement
