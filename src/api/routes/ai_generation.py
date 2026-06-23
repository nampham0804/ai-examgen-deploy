from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.repositories.database import get_db
from src.schemas.ai_generation import QuestionGenerationRead, QuestionGenerationRequest
from src.services.ai_generation_service import AIGenerationError, generate_questions_from_chunks

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/generate-questions")
def post_generate_questions(payload: QuestionGenerationRequest, db: Session = Depends(get_db)):
    try:
        result = generate_questions_from_chunks(
            db,
            document_id=payload.document_id,
            learning_outcome_id=payload.learning_outcome_id,
            question_type=payload.question_type,
            difficulty=payload.difficulty,
            num_questions=payload.num_questions,
            topic=payload.topic,
            top_k=payload.top_k,
            diversity_mode=payload.diversity_mode,
        )
    except AIGenerationError as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.error, "detail": exc.detail},
        )

    return {
        "data": QuestionGenerationRead.model_validate(result),
        "message": "Generated questions from retrieved chunks",
    }
