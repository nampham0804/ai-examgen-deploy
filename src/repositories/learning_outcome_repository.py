from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.learning_outcome import LearningOutcome


def get_learning_outcome(db: Session, learning_outcome_id: int) -> LearningOutcome | None:
    return db.get(LearningOutcome, learning_outcome_id)


def list_learning_outcomes(db: Session, course_id: int) -> list[LearningOutcome]:
    statement = (
        select(LearningOutcome)
        .where(LearningOutcome.course_id == course_id)
        .order_by(LearningOutcome.code)
    )
    return list(db.scalars(statement).all())


def create_learning_outcome(
    db: Session,
    *,
    course_id: int,
    code: str,
    description: str,
    bloom_level: str | None,
) -> LearningOutcome:
    learning_outcome = LearningOutcome(
        course_id=course_id,
        code=code,
        description=description,
        bloom_level=bloom_level,
    )
    db.add(learning_outcome)
    db.commit()
    db.refresh(learning_outcome)
    return learning_outcome
