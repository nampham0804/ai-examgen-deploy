import pytest


def _generation_payload(num_questions: int):
    return {
        "document_id": 1,
        "learning_outcome_id": 1,
        "question_type": "mcq",
        "difficulty": "medium",
        "num_questions": num_questions,
        "topic": "database basics",
        "top_k": 3,
        "diversity_mode": True,
    }


@pytest.mark.asyncio
async def test_generate_questions_rejects_num_questions_below_min(client):
    response = await client.post("/api/ai/generate-questions", json=_generation_payload(0))

    assert response.status_code == 422
    assert response.json()["error"] == "Validation error"


@pytest.mark.asyncio
async def test_generate_questions_rejects_num_questions_above_max(client):
    response = await client.post("/api/ai/generate-questions", json=_generation_payload(6))

    assert response.status_code == 422
    assert response.json()["error"] == "Validation error"
