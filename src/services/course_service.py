from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.repositories import course_repository
from src.schemas.course import CourseCreate, CourseUpdate


def list_courses(db: Session, owner_id: int):
    return course_repository.get_courses(db, owner_id)


def get_course(db: Session, course_id: int, owner_id: int):
    course = course_repository.get_course_by_id(db, course_id)
    if course is None or course.owner_id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Not found", "detail": "Course not found"},
        )
    return course


def create_course(db: Session, payload: CourseCreate, owner_id: int):
    existing = course_repository.get_course_by_code(db, payload.code, owner_id)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "Conflict", "detail": "Course code already exists"},
        )
    return course_repository.create_course(db, payload, owner_id=owner_id)


def update_course(db: Session, course_id: int, payload: CourseUpdate, owner_id: int):
    course = get_course(db, course_id, owner_id)
    if payload.code is not None:
        existing = course_repository.get_course_by_code(db, payload.code, owner_id)
        if existing is not None and existing.id != course_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": "Conflict", "detail": "Course code already exists"},
            )
    return course_repository.update_course(db, course, payload)


def delete_course(db: Session, course_id: int, owner_id: int) -> None:
    course = get_course(db, course_id, owner_id)
    course_repository.delete_course(db, course)
