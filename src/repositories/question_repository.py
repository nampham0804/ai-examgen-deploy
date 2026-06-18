from sqlalchemy.orm import Session

from src.models.question import Question


def create_questions(db: Session, questions: list[dict]) -> list[Question]:
    rows = [Question(**question) for question in questions]
    db.add_all(rows)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows
