from fastapi import APIRouter

from src.api.routes import courses, learning_outcomes

router = APIRouter()


@router.get("/status")
async def api_status():
    """Health check for the API router scaffold."""
    return {"status": "ready", "app": "AI ExamGen"}


router.include_router(courses.router, prefix="/courses", tags=["courses"])
router.include_router(learning_outcomes.router, tags=["learning-outcomes"])
