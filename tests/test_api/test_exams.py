import pytest


async def _create_course(client):
    response = await client.post(
        "/api/courses",
        json={
            "code": "CS501",
            "name": "Database Systems",
            "description": "Exam workflow test course",
        },
    )
    assert response.status_code == 201
    return response.json()["data"]


async def _create_learning_outcome(client, course_id: int):
    response = await client.post(
        f"/api/courses/{course_id}/learning-outcomes",
        json={
            "code": "LO1",
            "description": "Explain relational database concepts",
            "bloom_level": "understand",
        },
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


async def _create_approved_question(client, course_id: int, learning_outcome_id: int, text: str):
    response = await client.post("/api/questions", json=_question_payload(course_id, learning_outcome_id, text))
    assert response.status_code == 201
    return response.json()["data"]


async def _create_validated_blueprint(client, course_id: int, learning_outcome_id: int):
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
    )
    assert response.status_code == 200
    blueprint = response.json()["data"]

    validate_response = await client.post(f"/api/blueprints/{blueprint['id']}/validate")
    assert validate_response.status_code == 200
    assert validate_response.json()["data"]["is_valid"] is True
    return blueprint


async def _create_generated_exam(client, course_id: int, blueprint_id: int):
    create_response = await client.post(
        "/api/exams",
        json={
            "course_id": course_id,
            "blueprint_id": blueprint_id,
            "title": "Database midterm exam",
            "duration_minutes": 60,
        },
    )
    assert create_response.status_code == 200
    exam = create_response.json()["data"]

    generate_response = await client.post(f"/api/exams/{exam['id']}/generate")
    assert generate_response.status_code == 200
    return generate_response.json()["data"]


@pytest.mark.asyncio
async def test_exam_preview_uses_question_snapshot_after_source_question_changes(client):
    course = await _create_course(client)
    learning_outcome = await _create_learning_outcome(client, course["id"])
    question = await _create_approved_question(
        client,
        course["id"],
        learning_outcome["id"],
        "What is an entity in an ER model?",
    )
    blueprint = await _create_validated_blueprint(client, course["id"], learning_outcome["id"])
    exam = await _create_generated_exam(client, course["id"], blueprint["id"])

    preview_response = await client.get(f"/api/exams/{exam['id']}/preview")
    assert preview_response.status_code == 200
    first_preview_question = preview_response.json()["data"]["questions"][0]
    assert first_preview_question["text"] == "What is an entity in an ER model?"

    update_response = await client.put(
        f"/api/questions/{question['id']}",
        json={
            "question_text": "Updated source question text",
            "correct_answer": "A",
        },
    )
    assert update_response.status_code == 200

    second_preview_response = await client.get(f"/api/exams/{exam['id']}/preview")
    assert second_preview_response.status_code == 200
    second_preview_question = second_preview_response.json()["data"]["questions"][0]
    assert second_preview_question["text"] == "What is an entity in an ER model?"


@pytest.mark.asyncio
async def test_approved_exam_cannot_be_modified(client):
    course = await _create_course(client)
    learning_outcome = await _create_learning_outcome(client, course["id"])
    await _create_approved_question(client, course["id"], learning_outcome["id"], "What is an entity?")
    await _create_approved_question(client, course["id"], learning_outcome["id"], "What is an attribute?")
    blueprint = await _create_validated_blueprint(client, course["id"], learning_outcome["id"])
    exam = await _create_generated_exam(client, course["id"], blueprint["id"])

    approve_response = await client.put(f"/api/exams/{exam['id']}", json={"status": "approved"})
    assert approve_response.status_code == 200

    update_response = await client.put(f"/api/exams/{exam['id']}", json={"title": "Changed title"})
    assert update_response.status_code == 400

    preview_response = await client.get(f"/api/exams/{exam['id']}/preview")
    assert preview_response.status_code == 200
    question_id = preview_response.json()["data"]["questions"][0]["question_id"]

    swap_response = await client.put(f"/api/exams/{exam['id']}/questions/{question_id}/swap")
    assert swap_response.status_code == 400

    reorder_response = await client.put(
        f"/api/exams/{exam['id']}/reorder",
        json={"items": [{"id": preview_response.json()["data"]["questions"][0]["id"], "order_index": 1}]},
    )
    assert reorder_response.status_code == 400
