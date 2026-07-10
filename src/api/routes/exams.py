
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.models.user import User
from src.schemas.exam_schema import (
    ExamCreate,
    ExamListResponse,
    ExamPreviewResponse,
    ExamReorderRequest,
    ExamResponse,
    ExamUpdate,
)
from src.services.exam_service import ExamService

router = APIRouter(prefix="/exams", tags=["exams"])


@router.post("", response_model=ExamResponse)
def create_exam(exam_in: ExamCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    exam = service.create_exam(exam_in, current_user.id)
    return {"data": exam, "message": "Exam created successfully"}


@router.get("", response_model=ExamListResponse)
def get_exams(course_id: int | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    exams = service.get_exams(course_id, current_user.id)
    return {"data": exams, "message": "Exams retrieved successfully"}


@router.get("/{exam_id}", response_model=ExamResponse)
def get_exam(exam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    exam = service.get_exam_by_id(exam_id, current_user.id)
    return {"data": exam, "message": "Exam retrieved successfully"}


@router.put("/{exam_id}", response_model=ExamResponse)
def update_exam(exam_id: int, exam_in: ExamUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    exam = service.update_exam(exam_id, exam_in, current_user.id)
    return {"data": exam, "message": "Exam updated successfully"}


@router.post("/{exam_id}/generate", response_model=ExamResponse)
def generate_exam(exam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    exam = service.generate_exam(exam_id, current_user.id)
    return {"data": exam, "message": "Exam generated successfully"}


@router.get("/{exam_id}/preview", response_model=ExamPreviewResponse)
def get_exam_preview(exam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    preview_data = service.get_exam_preview(exam_id, current_user.id)
    return {"data": preview_data, "message": "Exam preview retrieved successfully"}


@router.put("/{exam_id}/questions/{question_id}/swap")
def swap_exam_question(exam_id: int, question_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    result = service.swap_exam_question(exam_id, question_id, current_user.id)
    return {"data": result, "message": "Question swapped successfully"}


@router.put("/{exam_id}/reorder")
def reorder_exam(exam_id: int, request: ExamReorderRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    items = [item.dict() for item in request.items]
    result = service.reorder_exam(exam_id, items, current_user.id)
    return {"data": result, "message": "Exam reordered successfully"}


@router.delete("/{exam_id}")
def delete_exam(exam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    service.delete_exam(exam_id, current_user.id)
    return {"data": {}, "message": "Exam deleted successfully"}

