from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.course import Course


def list_courses(db: Session) -> list[Course]:
    return list(db.scalars(select(Course).order_by(Course.code)).all())


def get_course(db: Session, course_id: int) -> Course | None:
    return db.get(Course, course_id)


def create_course(db: Session, *, code: str, name: str, description: str | None) -> Course:
    course = Course(code=code, name=name, description=description)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course
