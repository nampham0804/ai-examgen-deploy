import pytest


def _generation_payload(num_questions: int, document_id: int = 1, learning_outcome_id: int = 1):
    return {
        "document_id": document_id,
        "learning_outcome_id": learning_outcome_id,
        "question_type": "mcq",
        "difficulty": "medium",
        "num_questions": num_questions,
        "topic": "database basics",
        "top_k": 3,
        "diversity_mode": True,
    }


@pytest.mark.asyncio
async def test_generate_questions_rejects_num_questions_below_min(client, auth_headers):
    response = await client.post("/api/ai/generate-questions", json=_generation_payload(0), headers=auth_headers)

    assert response.status_code == 422
    assert response.json()["error"] == "Validation error"


@pytest.mark.asyncio
async def test_generate_questions_rejects_num_questions_above_max(client, auth_headers):
    response = await client.post("/api/ai/generate-questions", json=_generation_payload(6), headers=auth_headers)

    assert response.status_code == 422
    assert response.json()["error"] == "Validation error"


@pytest.mark.asyncio
async def test_generate_questions_isolation(client, auth_headers, auth_headers_other):
    # 1. User A creates a course, learning outcome, and document
    course_response = await client.post(
        "/api/courses",
        json={"code": "GEN-ISO", "name": "Gen Iso Course"},
        headers=auth_headers,
    )
    assert course_response.status_code == 201
    course_a = course_response.json()["data"]

    lo_response = await client.post(
        f"/api/courses/{course_a['id']}/learning-outcomes",
        json={"code": "LO-GEN", "description": "LO for gen questions"},
        headers=auth_headers,
    )
    assert lo_response.status_code == 201
    lo_a = lo_response.json()["data"]

    doc_response = await client.post(
        "/api/documents/upload",
        data={"course_id": str(course_a["id"]), "document_type": "lecture"},
        files={
            "file": (
                "gen.docx",
                b"small docx for generation tests",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers=auth_headers,
    )
    assert doc_response.status_code == 201
    doc_a = doc_response.json()["data"]

    # 2. User B tries to generate questions using User A's document or learning outcome - should be 404
    gen_other = await client.post(
        "/api/ai/generate-questions",
        json=_generation_payload(2, document_id=doc_a["id"], learning_outcome_id=lo_a["id"]),
        headers=auth_headers_other,
    )
    assert gen_other.status_code == 404
