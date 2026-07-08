from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.models.user import User
from src.schemas.course import CourseCreate, CourseResponse, CourseUpdate
from src.services import course_service

router = APIRouter()


@router.get("", response_model=dict)
def list_courses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    courses = course_service.list_courses(db, current_user.id)
    return {
        "data": [CourseResponse.model_validate(course) for course in courses],
        "message": "Courses loaded",
    }


@router.post("", status_code=status.HTTP_201_CREATED, response_model=dict)
def create_course(payload: CourseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = course_service.create_course(db, payload, current_user.id)
    return {
        "data": CourseResponse.model_validate(course),
        "message": "Course created",
    }


@router.get("/{course_id}", response_model=dict)
def get_course(course_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = course_service.get_course(db, course_id, current_user.id)
    return {
        "data": CourseResponse.model_validate(course),
        "message": "Course loaded",
    }


@router.put("/{course_id}", response_model=dict)
def update_course(course_id: int, payload: CourseUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = course_service.update_course(db, course_id, payload, current_user.id)
    return {
        "data": CourseResponse.model_validate(course),
        "message": "Course updated",
    }


@router.delete("/{course_id}", response_model=dict)
def delete_course(course_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course_service.delete_course(db, course_id, current_user.id)
    return {
        "data": {"id": course_id},
        "message": "Course deleted",
    }

