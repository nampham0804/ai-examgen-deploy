from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

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

    difficulty_counts = db.execute(
        select(Question.difficulty, func.count(Question.id))
        .group_by(Question.difficulty)
    ).all()

    difficulty_distribution = {
        "easy": 0,
        "medium": 0,
        "hard": 0
    }
    for diff, count in difficulty_counts:
        if diff in difficulty_distribution:
            difficulty_distribution[diff] = count

    type_counts = db.execute(
        select(Question.question_type, func.count(Question.id))
        .group_by(Question.question_type)
    ).all()
    type_distribution = [{"name": t, "value": c} for t, c in type_counts]

    recent_qs = db.execute(
        select(Question)
        .options(joinedload(Question.course), joinedload(Question.learning_outcome))
        .order_by(Question.created_at.desc())
        .limit(5)
    ).scalars().all()

    recent_exams_query = db.execute(
        select(Exam, Course)
        .outerjoin(Course, Exam.course_id == Course.id)
        .order_by(Exam.created_at.desc())
        .limit(5)
    ).all()

    return {
        "data": {
            "courses": db.scalar(select(func.count()).select_from(Course)) or 0,
            "questions_total": questions_total,
            "questions_pending": questions_pending,
            "questions_approved": questions_approved,
            "blueprints": db.scalar(select(func.count()).select_from(ExamBlueprint)) or 0,
            "exams": db.scalar(select(func.count()).select_from(Exam)) or 0,
            "difficulty_distribution": difficulty_distribution,
            "type_distribution": type_distribution,
            "recent_questions": [
                {
                    "id": q.id,
                    "text": q.question_text[:100] + "..." if len(q.question_text) > 100 else q.question_text,
                    "course": q.course.name if q.course else "Unknown",
                    "lo": q.learning_outcome.code if q.learning_outcome else "Unknown",
                    "difficulty": q.difficulty,
                    "status": q.status,
                    "created_at": q.created_at.isoformat()
                } for q in recent_qs
            ],
            "recent_exams": [
                {
                    "id": e.Exam.id,
                    "title": e.Exam.title,
                    "course": e.Course.name if e.Course else "Unknown",
                    "total_questions": e.Exam.total_questions,
                    "status": e.Exam.status,
                    "created_at": e.Exam.created_at.isoformat()
                } for e in recent_exams_query
            ]
        },
        "message": "Dashboard loaded",
    }
