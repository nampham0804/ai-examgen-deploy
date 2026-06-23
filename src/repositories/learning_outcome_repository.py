from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.learning_outcome import LearningOutcome
from src.schemas.learning_outcome import LearningOutcomeCreate, LearningOutcomeUpdate


def get_learning_outcomes_by_course(db: Session, course_id: int) -> list[LearningOutcome]:
    return list(db.scalars(select(LearningOutcome).where(LearningOutcome.course_id == course_id).order_by(LearningOutcome.id)).all())


def get_learning_outcome_by_id(db: Session, learning_outcome_id: int) -> LearningOutcome | None:
    return db.get(LearningOutcome, learning_outcome_id)


def get_learning_outcome(db: Session, learning_outcome_id: int) -> LearningOutcome | None:
    return get_learning_outcome_by_id(db, learning_outcome_id)


def get_learning_outcome_by_course_and_code(db: Session, course_id: int, code: str) -> LearningOutcome | None:
    return db.scalar(
        select(LearningOutcome).where(
            LearningOutcome.course_id == course_id,
            LearningOutcome.code == code,
        )
    )


def create_learning_outcome(
    db: Session,
    course_id: int,
    payload: LearningOutcomeCreate,
) -> LearningOutcome:
    learning_outcome = LearningOutcome(
        course_id=course_id,
        code=payload.code,
        description=payload.description,
        bloom_level=payload.bloom_level,
    )
    db.add(learning_outcome)
    db.commit()
    db.refresh(learning_outcome)
    return learning_outcome


def update_learning_outcome(
    db: Session,
    learning_outcome: LearningOutcome,
    payload: LearningOutcomeUpdate,
) -> LearningOutcome:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(learning_outcome, field, value)
    db.commit()
    db.refresh(learning_outcome)
    return learning_outcome


def delete_learning_outcome(db: Session, learning_outcome: LearningOutcome) -> None:
    db.delete(learning_outcome)
    db.commit()
