import pytest


async def _create_course(client, headers: dict, code: str = "CS401"):
    response = await client.post(
        "/api/courses",
        json={
            "code": code,
            "name": "Machine Learning",
            "description": "Course for question review tests",
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["data"]


async def _create_learning_outcome(client, course_id: int, headers: dict, code: str = "LO1"):
    response = await client.post(
        f"/api/courses/{course_id}/learning-outcomes",
        json={
            "code": code,
            "description": f"{code} description",
            "bloom_level": "understand",
        },
        headers=headers,
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
async def test_question_review_approval_flow(client, auth_headers):
    course = await _create_course(client, auth_headers)
    learning_outcome = await _create_learning_outcome(client, course["id"], auth_headers)

    create_response = await client.post("/api/questions", json=_mcq_payload(course["id"], learning_outcome["id"]), headers=auth_headers)
    assert create_response.status_code == 201
    created = create_response.json()["data"]
    assert created["status"] == "pending_review"
    assert created["question_type"] == "mcq"

    list_response = await client.get("/api/questions?status=pending_review", headers=auth_headers)
    assert list_response.status_code == 200
    listed = list_response.json()["data"]
    assert listed["total"] == 1
    assert listed["items"][0]["id"] == created["id"]

    detail_response = await client.get(f"/api/questions/{created['id']}", headers=auth_headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["data"]["question_text"] == created["question_text"]

    update_response = await client.put(
        f"/api/questions/{created['id']}",
        json={
            "question_text": "Which model is commonly trained with labeled data?",
            "difficulty": "hard",
            "correct_answer": "B",
        },
        headers=auth_headers,
    )
    assert update_response.status_code == 200
    updated = update_response.json()["data"]
    assert updated["difficulty"] == "hard"
    assert updated["question_text"] == "Which model is commonly trained with labeled data?"

    approve_response = await client.post(f"/api/questions/{created['id']}/approve", headers=auth_headers)
    assert approve_response.status_code == 200
    approved = approve_response.json()["data"]
    assert approved["status"] == "approved"
    assert approved["approved_by"] is not None
    assert approved["approved_at"] is not None

    approved_filter_response = await client.get(
        f"/api/questions?status=approved&course_id={course['id']}&learning_outcome_id=1&question_type=mcq&difficulty=hard",
        headers=auth_headers,
    )
    assert approved_filter_response.status_code == 200
    assert approved_filter_response.json()["data"]["total"] == 1

    reject_response = await client.post(f"/api/questions/{created['id']}/reject", headers=auth_headers)
    assert reject_response.status_code == 200
    rejected = reject_response.json()["data"]
    assert rejected["status"] == "rejected"
    assert rejected["approved_by"] is None
    assert rejected["approved_at"] is None


@pytest.mark.asyncio
async def test_question_validation_rejects_invalid_shapes(client, auth_headers):
    course = await _create_course(client, auth_headers)
    learning_outcome = await _create_learning_outcome(client, course["id"], auth_headers)

    invalid_mcq = _mcq_payload(course["id"], learning_outcome["id"])
    invalid_mcq["options"] = invalid_mcq["options"][:3]
    invalid_response = await client.post("/api/questions", json=invalid_mcq, headers=auth_headers)
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
    essay_response = await client.post("/api/questions", json=invalid_essay, headers=auth_headers)
    assert essay_response.status_code == 422


@pytest.mark.asyncio
async def test_question_bank_filters_approved_questions(client, auth_headers):
    course = await _create_course(client, auth_headers)
    other_course = await _create_course(client, auth_headers, code="CS402")
    lo_one = await _create_learning_outcome(client, course["id"], auth_headers, code="LO1")
    lo_two = await _create_learning_outcome(client, course["id"], auth_headers, code="LO2")
    other_lo = await _create_learning_outcome(client, other_course["id"], auth_headers, code="LO1")

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
        response = await client.post("/api/questions", json=payload, headers=auth_headers)
        assert response.status_code == 201

    response = await client.get(
        f"/api/questions?status=approved&course_id={course['id']}&learning_outcome_id={lo_one['id']}"
        "&question_type=mcq&difficulty=medium&page=1&page_size=20",
        headers=auth_headers,
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
async def test_question_bank_returns_empty_list_when_no_match(client, auth_headers):
    course = await _create_course(client, auth_headers)
    learning_outcome = await _create_learning_outcome(client, course["id"], auth_headers)
    payload = _mcq_payload(course["id"], learning_outcome["id"])
    payload["status"] = "approved"

    create_response = await client.post("/api/questions", json=payload, headers=auth_headers)
    assert create_response.status_code == 201

    response = await client.get(f"/api/questions?status=approved&course_id={course['id']}&difficulty=hard", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_question_bank_page_pagination(client, auth_headers):
    course = await _create_course(client, auth_headers)
    learning_outcome = await _create_learning_outcome(client, course["id"], auth_headers)

    for index in range(25):
        payload = _mcq_payload(course["id"], learning_outcome["id"])
        payload["question_text"] = f"Approved question number {index}"
        payload["status"] = "approved"
        response = await client.post("/api/questions", json=payload, headers=auth_headers)
        assert response.status_code == 201

    first_page = await client.get("/api/questions?status=approved&page=1&page_size=20", headers=auth_headers)
    second_page = await client.get("/api/questions?status=approved&page=2&page_size=20", headers=auth_headers)

    assert first_page.status_code == 200
    assert second_page.status_code == 200
    assert first_page.json()["data"]["total"] == 25
    assert len(first_page.json()["data"]["items"]) == 20
    assert len(second_page.json()["data"]["items"]) == 5


@pytest.mark.asyncio
async def test_question_isolation(client, auth_headers, auth_headers_other):
    # 1. User A creates a course, learning outcome, and question
    course_a = await _create_course(client, auth_headers, code="QA")
    lo_a = await _create_learning_outcome(client, course_a["id"], auth_headers)
    question_a = (await client.post(
        "/api/questions",
        json=_mcq_payload(course_a["id"], lo_a["id"]),
        headers=auth_headers,
    )).json()["data"]

    # 2. User B tries to create a question on User A's course - should be 404
    post_b = await client.post(
        "/api/questions",
        json=_mcq_payload(course_a["id"], lo_a["id"]),
        headers=auth_headers_other,
    )
    assert post_b.status_code == 404

    # 3. User B tries to list questions - should not return User A's question
    list_b = await client.get("/api/questions", headers=auth_headers_other)
    assert list_b.status_code == 200
    assert not any(q["id"] == question_a["id"] for q in list_b.json()["data"]["items"])

    # 4. User B tries to read User A's question detail - should be 404
    get_b = await client.get(f"/api/questions/{question_a['id']}", headers=auth_headers_other)
    assert get_b.status_code == 404

    # 5. User B tries to update User A's question - should be 404
    put_b = await client.put(
        f"/api/questions/{question_a['id']}",
        json={"question_text": "Hacked question text"},
        headers=auth_headers_other,
    )
    assert put_b.status_code == 404

    # 6. User B tries to approve User A's question - should be 404
    approve_b = await client.post(f"/api/questions/{question_a['id']}/approve", headers=auth_headers_other)
    assert approve_b.status_code == 404

    # 7. User B tries to reject User A's question - should be 404
    reject_b = await client.post(f"/api/questions/{question_a['id']}/reject", headers=auth_headers_other)
    assert reject_b.status_code == 404


@pytest.mark.asyncio
async def test_question_creation_reference_validation(client, auth_headers, auth_headers_other):
    # 1. Setup User A's resources
    course_a1 = await _create_course(client, auth_headers, code="QA1")
    lo_a1 = await _create_learning_outcome(client, course_a1["id"], auth_headers, code="LOA1")
    
    course_a2 = await _create_course(client, auth_headers, code="QA2")
    lo_a2 = await _create_learning_outcome(client, course_a2["id"], auth_headers, code="LOA2")

    response_doc_a = await client.post(
        "/api/documents/upload",
        data={"course_id": str(course_a1["id"]), "document_type": "lecture"},
        files={
            "file": (
                "doc_a.docx",
                b"small docx for validation tests",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers=auth_headers,
    )
    assert response_doc_a.status_code == 201
    doc_a = response_doc_a.json()["data"]

    # 2. Setup User B's resources
    course_b = await _create_course(client, auth_headers_other, code="QB")
    lo_b = await _create_learning_outcome(client, course_b["id"], auth_headers_other, code="LOB")

    response_doc_b = await client.post(
        "/api/documents/upload",
        data={"course_id": str(course_b["id"]), "document_type": "lecture"},
        files={
            "file": (
                "doc_b.docx",
                b"small docx for user b",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers=auth_headers_other,
    )
    assert response_doc_b.status_code == 201
    doc_b = response_doc_b.json()["data"]

    # 3. User A attempts to create a question on course_a1 referencing lo_a2 (wrong course) -> 404
    payload_wrong_course_lo = _mcq_payload(course_a1["id"], lo_a2["id"])
    res1 = await client.post("/api/questions", json=payload_wrong_course_lo, headers=auth_headers)
    assert res1.status_code == 404

    # 4. User A attempts to create a question on course_a1 referencing lo_b (wrong user) -> 404
    payload_other_user_lo = _mcq_payload(course_a1["id"], lo_b["id"])
    res2 = await client.post("/api/questions", json=payload_other_user_lo, headers=auth_headers)
    assert res2.status_code == 404

    # 5. User A attempts to create a question referencing doc_b (wrong user) -> 404
    payload_other_user_doc = _mcq_payload(course_a1["id"], lo_a1["id"])
    payload_other_user_doc["document_id"] = doc_b["id"]
    res3 = await client.post("/api/questions", json=payload_other_user_doc, headers=auth_headers)
    assert res3.status_code == 404

    # 6. User A attempts to create a question referencing doc_a but on course_a2 (wrong course for document) -> 404
    payload_wrong_course_doc = _mcq_payload(course_a2["id"], lo_a2["id"])
    payload_wrong_course_doc["document_id"] = doc_a["id"]
    res4 = await client.post("/api/questions", json=payload_wrong_course_doc, headers=auth_headers)
    assert res4.status_code == 404

    # 7. User A successfully creates a question with matching course, LO, and document -> 201
    payload_ok = _mcq_payload(course_a1["id"], lo_a1["id"])
    payload_ok["document_id"] = doc_a["id"]
    res5 = await client.post("/api/questions", json=payload_ok, headers=auth_headers)
    assert res5.status_code == 201
