from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.models.user import User
from src.schemas.retrieval import ChunkRetrievalRead, ChunkRetrievalRequest
from src.services.retrieval_service import RetrievalError, retrieve_relevant_chunks

router = APIRouter(prefix="/retrieval", tags=["retrieval"])


@router.post("/chunks")
def post_retrieve_chunks(
    payload: ChunkRetrievalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = retrieve_relevant_chunks(
            db,
            document_id=payload.document_id,
            learning_outcome_id=payload.learning_outcome_id,
            topic=payload.topic,
            top_k=payload.top_k,
            extra_keywords=payload.extra_keywords,
            user_id=current_user.id,
        )
    except RetrievalError as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.error, "detail": exc.detail},
        )

    return {
        "data": ChunkRetrievalRead.model_validate(result),
        "message": "Retrieved relevant chunks",
    }
