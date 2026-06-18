from fastapi import APIRouter

from src.api.routes import blueprints, exams

router = APIRouter()
router.include_router(blueprints.router)
router.include_router(exams.router)

@router.get("/status")
async def api_status():
    """Health check for the API router scaffold."""
    return {"status": "ready", "app": "AI ExamGen"}
