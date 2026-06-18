from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models.course import Course
from src.models.exam import Exam, ExamBlueprint
from src.models.question import Question
from src.repositories.database import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    questions_total = db.scalar(select(func.count()).select_from(Question)) or 0
    questions_pending = db.scalar(
        select(func.count()).select_from(Question).where(Question.status == "pending_review")
    ) or 0
    questions_approved = db.scalar(
        select(func.count()).select_from(Question).where(Question.status == "approved")
    ) or 0

    return {
        "data": {
            "courses": db.scalar(select(func.count()).select_from(Course)) or 0,
            "questions_total": questions_total,
            "questions_pending": questions_pending,
            "questions_approved": questions_approved,
            "blueprints": db.scalar(select(func.count()).select_from(ExamBlueprint)) or 0,
            "exams": db.scalar(select(func.count()).select_from(Exam)) or 0,
        },
        "message": "Dashboard loaded",
    }
