from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.repositories.database import get_db
from src.schemas.retrieval import ChunkRetrievalRead, ChunkRetrievalRequest
from src.services.retrieval_service import RetrievalError, retrieve_relevant_chunks

router = APIRouter(prefix="/retrieval", tags=["retrieval"])


@router.post("/chunks")
def post_retrieve_chunks(payload: ChunkRetrievalRequest, db: Session = Depends(get_db)):
    try:
        result = retrieve_relevant_chunks(
            db,
            document_id=payload.document_id,
            learning_outcome_id=payload.learning_outcome_id,
            topic=payload.topic,
            top_k=payload.top_k,
            extra_keywords=payload.extra_keywords,
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
