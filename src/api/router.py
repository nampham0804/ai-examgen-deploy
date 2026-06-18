from fastapi import APIRouter

from src.api.routes import analytics, blueprints, courses, exams, learning_outcomes
from src.api.routes.ai_generation import router as ai_generation_router
from src.api.routes.documents import router as documents_router
from src.api.routes.questions import router as questions_router
from src.api.routes.retrieval import router as retrieval_router

router = APIRouter()
router.include_router(ai_generation_router)
router.include_router(documents_router)
router.include_router(questions_router)
router.include_router(retrieval_router)
router.include_router(analytics.router)
router.include_router(blueprints.router)
router.include_router(exams.router)


@router.get("/status")
async def api_status():
    """Health check for the API router scaffold."""
    return {"status": "ready", "app": "AI ExamGen"}


router.include_router(courses.router, prefix="/courses", tags=["courses"])
router.include_router(learning_outcomes.router, tags=["learning-outcomes"])
