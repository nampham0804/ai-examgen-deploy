from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.repositories.course_repository import create_course, get_course, list_courses
from src.repositories.database import get_db
from src.repositories.learning_outcome_repository import (
    create_learning_outcome,
    list_learning_outcomes,
)
from src.schemas.course import CourseCreate, CourseRead
from src.schemas.learning_outcome import LearningOutcomeCreate, LearningOutcomeRead

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("")
def get_courses(db: Session = Depends(get_db)):
    courses = [CourseRead.model_validate(course) for course in list_courses(db)]
    return {"data": courses, "message": "Courses loaded"}


@router.post("", status_code=status.HTTP_201_CREATED)
def post_course(payload: CourseCreate, db: Session = Depends(get_db)):
    try:
        course = create_course(
            db,
            code=payload.code,
            name=payload.name,
            description=payload.description,
        )
    except IntegrityError:
        db.rollback()
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "Conflict", "detail": "Course code already exists"},
        )

    return {"data": CourseRead.model_validate(course), "message": "Course created"}


@router.get("/{course_id}/learning-outcomes")
def get_course_learning_outcomes(course_id: int, db: Session = Depends(get_db)):
    if get_course(db, course_id) is None:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Not found", "detail": "Course not found"},
        )

    learning_outcomes = [
        LearningOutcomeRead.model_validate(learning_outcome)
        for learning_outcome in list_learning_outcomes(db, course_id)
    ]
    return {"data": learning_outcomes, "message": "Learning outcomes loaded"}


@router.post("/{course_id}/learning-outcomes", status_code=status.HTTP_201_CREATED)
def post_course_learning_outcome(
    course_id: int,
    payload: LearningOutcomeCreate,
    db: Session = Depends(get_db),
):
    if get_course(db, course_id) is None:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Not found", "detail": "Course not found"},
        )

    try:
        learning_outcome = create_learning_outcome(
            db,
            course_id=course_id,
            code=payload.code,
            description=payload.description,
            bloom_level=payload.bloom_level,
        )
    except IntegrityError:
        db.rollback()
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "Conflict", "detail": "Learning outcome code already exists for this course"},
        )

    return {
        "data": LearningOutcomeRead.model_validate(learning_outcome),
        "message": "Learning outcome created",
    }
