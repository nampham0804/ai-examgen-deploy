from fastapi import APIRouter

from src.api.routes.ai_generation import router as ai_generation_router
from src.api.routes.courses import router as courses_router
from src.api.routes.documents import router as documents_router
from src.api.routes.retrieval import router as retrieval_router

router = APIRouter()
router.include_router(ai_generation_router)
router.include_router(courses_router)
router.include_router(documents_router)
router.include_router(retrieval_router)


@router.get("/status")
async def api_status():
    """Health check for the API router scaffold."""
    return {"status": "ready", "app": "AI ExamGen"}
