import pytest


async def _create_course(client, code: str = "CS401"):
    response = await client.post(
        "/api/courses",
        json={
            "code": code,
            "name": "Machine Learning",
            "description": "Course for question review tests",
        },
    )
    assert response.status_code == 201
    return response.json()["data"]


async def _create_learning_outcome(client, course_id: int, code: str = "LO1"):
    response = await client.post(
        f"/api/courses/{course_id}/learning-outcomes",
        json={
            "code": code,
            "description": f"{code} description",
            "bloom_level": "understand",
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
    learning_outcome = await _create_learning_outcome(client, course["id"])

    create_response = await client.post("/api/questions", json=_mcq_payload(course["id"], learning_outcome["id"]))
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
    learning_outcome = await _create_learning_outcome(client, course["id"])

    invalid_mcq = _mcq_payload(course["id"], learning_outcome["id"])
    invalid_mcq["options"] = invalid_mcq["options"][:3]
    invalid_response = await client.post("/api/questions", json=invalid_mcq)
    assert invalid_response.status_code == 422

    invalid_essay = {
        "course_id": course["id"],
        "learning_outcome_id": learning_outcome["id"],
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


@pytest.mark.asyncio
async def test_question_bank_filters_approved_questions(client):
    course = await _create_course(client)
    other_course = await _create_course(client, code="CS402")
    lo_one = await _create_learning_outcome(client, course["id"], code="LO1")
    lo_two = await _create_learning_outcome(client, course["id"], code="LO2")
    other_lo = await _create_learning_outcome(client, other_course["id"], code="LO1")

    approved_medium = _mcq_payload(course["id"], lo_one["id"])
    approved_medium["status"] = "approved"

    approved_easy = _mcq_payload(course["id"], lo_two["id"])
    approved_easy["question_text"] = "What is a labeled dataset?"
    approved_easy["difficulty"] = "easy"
    approved_easy["status"] = "approved"

    pending_medium = _mcq_payload(course["id"], lo_one["id"])
    pending_medium["question_text"] = "Which question is still pending?"
    pending_medium["status"] = "pending_review"

    other_course_question = _mcq_payload(other_course["id"], other_lo["id"])
    other_course_question["question_text"] = "Question from another course"
    other_course_question["status"] = "approved"

    for payload in [approved_medium, approved_easy, pending_medium, other_course_question]:
        response = await client.post("/api/questions", json=payload)
        assert response.status_code == 201

    response = await client.get(
        f"/api/questions?status=approved&course_id={course['id']}&learning_outcome_id={lo_one['id']}"
        "&question_type=mcq&difficulty=medium&page=1&page_size=20"
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 1
    assert data["items"][0]["question_text"] == approved_medium["question_text"]
    assert data["items"][0]["status"] == "approved"
    assert data["items"][0]["learning_outcome_id"] == lo_one["id"]
    assert data["items"][0]["course_code"] == course["code"]
    assert data["items"][0]["course_name"] == course["name"]
    assert data["items"][0]["learning_outcome_code"] == lo_one["code"]
    assert data["items"][0]["learning_outcome_description"] == lo_one["description"]


@pytest.mark.asyncio
async def test_question_bank_returns_empty_list_when_no_match(client):
    course = await _create_course(client)
    learning_outcome = await _create_learning_outcome(client, course["id"])
    payload = _mcq_payload(course["id"], learning_outcome["id"])
    payload["status"] = "approved"

    create_response = await client.post("/api/questions", json=payload)
    assert create_response.status_code == 201

    response = await client.get(f"/api/questions?status=approved&course_id={course['id']}&difficulty=hard")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_question_bank_page_pagination(client):
    course = await _create_course(client)
    learning_outcome = await _create_learning_outcome(client, course["id"])

    for index in range(25):
        payload = _mcq_payload(course["id"], learning_outcome["id"])
        payload["question_text"] = f"Approved question number {index}"
        payload["status"] = "approved"
        response = await client.post("/api/questions", json=payload)
        assert response.status_code == 201

    first_page = await client.get("/api/questions?status=approved&page=1&page_size=20")
    second_page = await client.get("/api/questions?status=approved&page=2&page_size=20")

    assert first_page.status_code == 200
    assert second_page.status_code == 200
    assert first_page.json()["data"]["total"] == 25
    assert len(first_page.json()["data"]["items"]) == 20
    assert len(second_page.json()["data"]["items"]) == 5
