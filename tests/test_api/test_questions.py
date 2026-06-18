import pytest


async def _create_course(client):
    response = await client.post(
        "/api/courses",
        json={
            "code": "CS401",
            "name": "Machine Learning",
            "description": "Course for question review tests",
        },
    )
    assert response.status_code == 201
    return response.json()["data"]


def _mcq_payload(course_id: int, learning_outcome_id: int = 1):
    return {
        "course_id": course_id,
        "learning_outcome_id": learning_outcome_id,
        "document_id": None,
        "question_type": "mcq",
        "question_text": "Which algorithm is supervised learning?",
        "difficulty": "medium",
        "options": [
            {"key": "A", "text": "K-Means"},
            {"key": "B", "text": "Linear Regression"},
            {"key": "C", "text": "DBSCAN"},
            {"key": "D", "text": "PCA"},
        ],
        "correct_answer": "B",
        "suggested_answer": None,
        "grading_rubric": None,
        "explanation": "Linear Regression learns from labeled data.",
        "status": "pending_review",
    }


@pytest.mark.asyncio
async def test_question_review_approval_flow(client):
    course = await _create_course(client)

    create_response = await client.post("/api/questions", json=_mcq_payload(course["id"]))
    assert create_response.status_code == 201
    created = create_response.json()["data"]
    assert created["status"] == "pending_review"
    assert created["question_type"] == "mcq"

    list_response = await client.get("/api/questions?status=pending_review")
    assert list_response.status_code == 200
    listed = list_response.json()["data"]
    assert listed["total"] == 1
    assert listed["items"][0]["id"] == created["id"]

    detail_response = await client.get(f"/api/questions/{created['id']}")
    assert detail_response.status_code == 200
    assert detail_response.json()["data"]["question_text"] == created["question_text"]

    update_response = await client.put(
        f"/api/questions/{created['id']}",
        json={
            "question_text": "Which model is commonly trained with labeled data?",
            "difficulty": "hard",
            "correct_answer": "B",
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()["data"]
    assert updated["difficulty"] == "hard"
    assert updated["question_text"] == "Which model is commonly trained with labeled data?"

    approve_response = await client.post(f"/api/questions/{created['id']}/approve")
    assert approve_response.status_code == 200
    approved = approve_response.json()["data"]
    assert approved["status"] == "approved"
    assert approved["approved_by"] == 1
    assert approved["approved_at"] is not None

    approved_filter_response = await client.get(
        f"/api/questions?status=approved&course_id={course['id']}&learning_outcome_id=1&question_type=mcq&difficulty=hard"
    )
    assert approved_filter_response.status_code == 200
    assert approved_filter_response.json()["data"]["total"] == 1

    reject_response = await client.post(f"/api/questions/{created['id']}/reject")
    assert reject_response.status_code == 200
    rejected = reject_response.json()["data"]
    assert rejected["status"] == "rejected"
    assert rejected["approved_by"] is None
    assert rejected["approved_at"] is None


@pytest.mark.asyncio
async def test_question_validation_rejects_invalid_shapes(client):
    course = await _create_course(client)

    invalid_mcq = _mcq_payload(course["id"])
    invalid_mcq["options"] = invalid_mcq["options"][:3]
    invalid_response = await client.post("/api/questions", json=invalid_mcq)
    assert invalid_response.status_code == 422

    invalid_essay = {
        "course_id": course["id"],
        "learning_outcome_id": 1,
        "question_type": "essay",
        "question_text": "Explain supervised learning.",
        "difficulty": "easy",
        "options": None,
        "correct_answer": None,
        "suggested_answer": None,
        "grading_rubric": None,
        "status": "pending_review",
    }
    essay_response = await client.post("/api/questions", json=invalid_essay)
    assert essay_response.status_code == 422
