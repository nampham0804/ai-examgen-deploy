from datetime import UTC, datetime

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from src.models.question import Question
from src.schemas.question import QuestionCreate, QuestionUpdate


def create_questions(db: Session, questions: list[dict]) -> list[Question]:
    rows = [Question(**question) for question in questions]
    db.add_all(rows)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows


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


def get_question(db: Session, question_id: int) -> Question | None:
    return db.get(Question, question_id)


def get_question_by_id(db: Session, question_id: int) -> Question | None:
    return get_question(db, question_id)


def list_questions_for_quality_check(db: Session, *, course_id: int, document_id: int) -> list[Question]:
    statement = select(Question).where(Question.course_id == course_id, Question.document_id == document_id)
    return list(db.scalars(statement).all())


def list_questions_for_quality_check_by_document_ids(
    db: Session,
    *,
    course_id: int,
    document_ids: list[int],
) -> list[Question]:
    statement = select(Question).where(Question.course_id == course_id, Question.document_id.in_(document_ids))
    return list(db.scalars(statement).all())


def list_recent_question_texts_for_prompt(
    db: Session,
    *,
    course_id: int,
    document_ids: list[int],
    limit: int = 20,
) -> list[str]:
    statement = (
        select(Question.question_text)
        .where(Question.course_id == course_id, Question.document_id.in_(document_ids))
        .order_by(Question.created_at.desc(), Question.id.desc())
        .limit(limit)
    )
    return [text for text in db.scalars(statement).all() if text]


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


def get_questions(
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
) -> tuple[list[Question], int]:
    return list_questions(
        db,
        status=status,
        course_id=course_id,
        document_id=document_id,
        learning_outcome_id=learning_outcome_id,
        question_type=question_type,
        difficulty=difficulty,
        limit=page_size,
        offset=(page - 1) * page_size,
    )


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
