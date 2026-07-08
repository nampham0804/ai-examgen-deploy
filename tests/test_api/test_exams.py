import pytest


async def _create_course(client, headers: dict):
    response = await client.post(
        "/api/courses",
        json={
            "code": "CS501",
            "name": "Database Systems",
            "description": "Exam workflow test course",
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["data"]


async def _create_learning_outcome(client, course_id: int, headers: dict):
    response = await client.post(
        f"/api/courses/{course_id}/learning-outcomes",
        json={
            "code": "LO1",
            "description": "Explain relational database concepts",
            "bloom_level": "understand",
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["data"]


def _question_payload(course_id: int, learning_outcome_id: int, text: str):
    return {
        "course_id": course_id,
        "learning_outcome_id": learning_outcome_id,
        "document_id": None,
        "question_type": "mcq",
        "question_text": text,
        "difficulty": "easy",
        "options": [
            {"key": "A", "text": "Entity"},
            {"key": "B", "text": "Relationship"},
            {"key": "C", "text": "Attribute"},
            {"key": "D", "text": "Tuple"},
        ],
        "correct_answer": "A",
        "suggested_answer": None,
        "grading_rubric": None,
        "explanation": "Entities are objects represented in the ER model.",
        "status": "approved",
    }


async def _create_approved_question(client, course_id: int, learning_outcome_id: int, text: str, headers: dict):
    response = await client.post("/api/questions", json=_question_payload(course_id, learning_outcome_id, text), headers=headers)
    assert response.status_code == 201
    return response.json()["data"]


async def _create_validated_blueprint(client, course_id: int, learning_outcome_id: int, headers: dict):
    response = await client.post(
        "/api/blueprints",
        json={
            "course_id": course_id,
            "title": "Database midterm blueprint",
            "items": [
                {
                    "learning_outcome_id": learning_outcome_id,
                    "question_type": "mcq",
                    "easy_count": 1,
                    "medium_count": 0,
                    "hard_count": 0,
                }
            ],
        },
        headers=headers,
    )
    assert response.status_code == 200
    blueprint = response.json()["data"]

    validate_response = await client.post(f"/api/blueprints/{blueprint['id']}/validate", headers=headers)
    assert validate_response.status_code == 200
    assert validate_response.json()["data"]["is_valid"] is True
    return blueprint


async def _create_generated_exam(client, course_id: int, blueprint_id: int, headers: dict):
    create_response = await client.post(
        "/api/exams",
        json={
            "course_id": course_id,
            "blueprint_id": blueprint_id,
            "title": "Database midterm exam",
            "duration_minutes": 60,
        },
        headers=headers,
    )
    assert create_response.status_code == 200
    exam = create_response.json()["data"]

    generate_response = await client.post(f"/api/exams/{exam['id']}/generate", headers=headers)
    assert generate_response.status_code == 200
    return generate_response.json()["data"]


@pytest.mark.asyncio
async def test_exam_preview_uses_question_snapshot_after_source_question_changes(client, auth_headers):
    course = await _create_course(client, auth_headers)
    learning_outcome = await _create_learning_outcome(client, course["id"], auth_headers)
    question = await _create_approved_question(
        client,
        course["id"],
        learning_outcome["id"],
        "What is an entity in an ER model?",
        auth_headers,
    )
    blueprint = await _create_validated_blueprint(client, course["id"], learning_outcome["id"], auth_headers)
    exam = await _create_generated_exam(client, course["id"], blueprint["id"], auth_headers)

    preview_response = await client.get(f"/api/exams/{exam['id']}/preview", headers=auth_headers)
    assert preview_response.status_code == 200
    first_preview_question = preview_response.json()["data"]["questions"][0]
    assert first_preview_question["text"] == "What is an entity in an ER model?"

    update_response = await client.put(
        f"/api/questions/{question['id']}",
        json={
            "question_text": "Updated source question text",
            "correct_answer": "A",
        },
        headers=auth_headers,
    )
    assert update_response.status_code == 200

    second_preview_response = await client.get(f"/api/exams/{exam['id']}/preview", headers=auth_headers)
    assert second_preview_response.status_code == 200
    second_preview_question = second_preview_response.json()["data"]["questions"][0]
    assert second_preview_question["text"] == "What is an entity in an ER model?"


@pytest.mark.asyncio
async def test_approved_exam_cannot_be_modified(client, auth_headers):
    course = await _create_course(client, auth_headers)
    learning_outcome = await _create_learning_outcome(client, course["id"], auth_headers)
    await _create_approved_question(client, course["id"], learning_outcome["id"], "What is an entity?", auth_headers)
    await _create_approved_question(client, course["id"], learning_outcome["id"], "What is an attribute?", auth_headers)
    blueprint = await _create_validated_blueprint(client, course["id"], learning_outcome["id"], auth_headers)
    exam = await _create_generated_exam(client, course["id"], blueprint["id"], auth_headers)

    approve_response = await client.put(f"/api/exams/{exam['id']}", json={"status": "approved"}, headers=auth_headers)
    assert approve_response.status_code == 200

    update_response = await client.put(f"/api/exams/{exam['id']}", json={"title": "Changed title"}, headers=auth_headers)
    assert update_response.status_code == 400

    preview_response = await client.get(f"/api/exams/{exam['id']}/preview", headers=auth_headers)
    assert preview_response.status_code == 200
    question_id = preview_response.json()["data"]["questions"][0]["question_id"]

    swap_response = await client.put(f"/api/exams/{exam['id']}/questions/{question_id}/swap", headers=auth_headers)
    assert swap_response.status_code == 400

    reorder_response = await client.put(
        f"/api/exams/{exam['id']}/reorder",
        json={"items": [{"id": preview_response.json()["data"]["questions"][0]["id"], "order_index": 1}]},
        headers=auth_headers,
    )
    assert reorder_response.status_code == 400


@pytest.mark.asyncio
async def test_exam_isolation(client, auth_headers, auth_headers_other):
    # 1. User A sets up course, questions, blueprint, and exam
    course_a = await _create_course(client, auth_headers)
    lo_a = await _create_learning_outcome(client, course_a["id"], auth_headers)
    await _create_approved_question(client, course_a["id"], lo_a["id"], "A's Question", auth_headers)
    blueprint_a = await _create_validated_blueprint(client, course_a["id"], lo_a["id"], auth_headers)
    exam_a = await _create_generated_exam(client, course_a["id"], blueprint_a["id"], auth_headers)

    # 2. User B tries to view blueprints - list should be empty
    list_bp_b = await client.get("/api/blueprints", headers=auth_headers_other)
    assert list_bp_b.status_code == 200
    assert not any(bp["id"] == blueprint_a["id"] for bp in list_bp_b.json()["data"])

    # 3. User B tries to view User A's blueprint detail - should be 404
    get_bp_b = await client.get(f"/api/blueprints/{blueprint_a['id']}", headers=auth_headers_other)
    assert get_bp_b.status_code == 404

    # 4. User B tries to validate User A's blueprint - should be 404
    validate_bp_b = await client.post(f"/api/blueprints/{blueprint_a['id']}/validate", headers=auth_headers_other)
    assert validate_bp_b.status_code == 404

    # 5. User B tries to list exams - should be empty
    list_ex_b = await client.get("/api/exams", headers=auth_headers_other)
    assert list_ex_b.status_code == 200
    assert not any(ex["id"] == exam_a["id"] for ex in list_ex_b.json()["data"])

    # 6. User B tries to read User A's exam - should be 404
    get_ex_b = await client.get(f"/api/exams/{exam_a['id']}", headers=auth_headers_other)
    assert get_ex_b.status_code == 404

    # 7. User B tries to swap question in User A's exam - should be 404
    swap_ex_b = await client.put(f"/api/exams/{exam_a['id']}/questions/1/swap", headers=auth_headers_other)
    assert swap_ex_b.status_code == 404

    # 8. User B tries to export User A's exam (requires approved status first)
    # Even if User A approves it, User B still shouldn't be able to export
    approve_a = await client.put(f"/api/exams/{exam_a['id']}", json={"status": "approved"}, headers=auth_headers)
    assert approve_a.status_code == 200

    export_gift_b = await client.get(f"/api/exports/gift?exam_id={exam_a['id']}", headers=auth_headers_other)
    assert export_gift_b.status_code == 404

    export_xml_b = await client.get(f"/api/exports/xml?exam_id={exam_a['id']}", headers=auth_headers_other)
    assert export_xml_b.status_code == 404

    # 9. Test analytics isolation
    # User A stats
    stats_a = (await client.get("/api/analytics/dashboard", headers=auth_headers)).json()["data"]
    assert stats_a["courses"] == 1
    assert stats_a["exams"] == 1

    # User B stats
    stats_b = (await client.get("/api/analytics/dashboard", headers=auth_headers_other)).json()["data"]
    assert stats_b["courses"] == 0
    assert stats_b["exams"] == 0
