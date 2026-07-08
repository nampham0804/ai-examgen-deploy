from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from src.api.deps import get_current_user, get_db
from src.models.course import Course
from src.models.exam import Exam, ExamBlueprint
from src.models.question import Question
from src.models.user import User

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    questions_total = db.scalar(
        select(func.count())
        .select_from(Question)
        .join(Course, Question.course_id == Course.id)
        .where(Course.owner_id == current_user.id)
    ) or 0

    questions_pending = db.scalar(
        select(func.count())
        .select_from(Question)
        .join(Course, Question.course_id == Course.id)
        .where(Question.status == "pending_review", Course.owner_id == current_user.id)
    ) or 0

    questions_approved = db.scalar(
        select(func.count())
        .select_from(Question)
        .join(Course, Question.course_id == Course.id)
        .where(Question.status == "approved", Course.owner_id == current_user.id)
    ) or 0

    difficulty_counts = db.execute(
        select(Question.difficulty, func.count(Question.id))
        .join(Course, Question.course_id == Course.id)
        .where(Course.owner_id == current_user.id)
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
        .join(Course, Question.course_id == Course.id)
        .where(Course.owner_id == current_user.id)
        .group_by(Question.question_type)
    ).all()
    type_distribution = [{"name": t, "value": c} for t, c in type_counts]

    recent_qs = db.execute(
        select(Question)
        .join(Course, Question.course_id == Course.id)
        .options(joinedload(Question.course), joinedload(Question.learning_outcome))
        .where(Course.owner_id == current_user.id)
        .order_by(Question.created_at.desc())
        .limit(5)
    ).scalars().all()

    recent_exams_query = db.execute(
        select(Exam, Course)
        .join(Course, Exam.course_id == Course.id)
        .where(Course.owner_id == current_user.id)
        .order_by(Exam.created_at.desc())
        .limit(5)
    ).all()

    courses_count = db.scalar(
        select(func.count())
        .select_from(Course)
        .where(Course.owner_id == current_user.id)
    ) or 0

    blueprints_count = db.scalar(
        select(func.count())
        .select_from(ExamBlueprint)
        .join(Course, ExamBlueprint.course_id == Course.id)
        .where(Course.owner_id == current_user.id)
    ) or 0

    exams_count = db.scalar(
        select(func.count())
        .select_from(Exam)
        .join(Course, Exam.course_id == Course.id)
        .where(Course.owner_id == current_user.id)
    ) or 0

    return {
        "data": {
            "courses": courses_count,
            "questions_total": questions_total,
            "questions_pending": questions_pending,
            "questions_approved": questions_approved,
            "blueprints": blueprints_count,
            "exams": exams_count,
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
