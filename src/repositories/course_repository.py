from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.course import Course
from src.schemas.course import CourseCreate, CourseUpdate


def get_courses(db: Session) -> list[Course]:
    return list(db.scalars(select(Course).order_by(Course.id.desc())).all())


def get_course_by_id(db: Session, course_id: int) -> Course | None:
    return db.get(Course, course_id)


def get_course_by_code(db: Session, code: str) -> Course | None:
    return db.scalar(select(Course).where(Course.code == code))


def create_course(db: Session, payload: CourseCreate, owner_id: int = 1) -> Course:
    course = Course(
        code=payload.code,
        name=payload.name,
        description=payload.description,
        owner_id=owner_id,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def update_course(db: Session, course: Course, payload: CourseUpdate) -> Course:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


def delete_course(db: Session, course: Course) -> None:
    db.delete(course)
    db.commit()
