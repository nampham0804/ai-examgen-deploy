
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.api.deps import get_db
from src.schemas.exam_schema import ExamCreate, ExamListResponse, ExamPreviewResponse, ExamResponse
from src.services.exam_service import ExamService

router = APIRouter(prefix="/exams", tags=["exams"])

@router.post("", response_model=ExamResponse)
def create_exam(exam_in: ExamCreate, db: Session = Depends(get_db)):
    service = ExamService(db)
    exam = service.create_exam(exam_in)
    return {"data": exam, "message": "Exam created successfully"}

@router.get("", response_model=ExamListResponse)
def get_exams(course_id: int | None = None, db: Session = Depends(get_db)):
    service = ExamService(db)
    if course_id is not None:
        exams = service.get_exams_by_course(course_id)
    else:
        # In a real app, you might want to paginate or return all
        exams = []
    return {"data": exams, "message": "Exams retrieved successfully"}

@router.get("/{exam_id}", response_model=ExamResponse)
def get_exam(exam_id: int, db: Session = Depends(get_db)):
    service = ExamService(db)
    exam = service.get_exam_by_id(exam_id)
    return {"data": exam, "message": "Exam retrieved successfully"}

@router.post("/{exam_id}/generate", response_model=ExamResponse)
def generate_exam(exam_id: int, db: Session = Depends(get_db)):
    service = ExamService(db)
    exam = service.generate_exam(exam_id)
    return {"data": exam, "message": "Exam generated successfully"}

@router.get("/{exam_id}/preview", response_model=ExamPreviewResponse)
def get_exam_preview(exam_id: int, db: Session = Depends(get_db)):
    service = ExamService(db)
    preview_data = service.get_exam_preview(exam_id)
    return {"data": preview_data, "message": "Exam preview retrieved successfully"}

@router.put("/{exam_id}/questions/{question_id}/swap")
def swap_exam_question(exam_id: int, question_id: int, db: Session = Depends(get_db)):
    service = ExamService(db)
    result = service.swap_exam_question(exam_id, question_id)
    return {"data": result, "message": "Question swapped successfully"}
