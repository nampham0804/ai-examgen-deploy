import pytest


@pytest.mark.asyncio
async def test_learning_outcome_crud_flow(client):
    course_response = await client.post(
        "/api/courses",
        json={
            "code": "CS499",
            "name": "Learning Outcome Test Course",
            "description": "Course used for LO CRUD tests",
        },
    )
    assert course_response.status_code == 201
    course = course_response.json()["data"]

    create_response = await client.post(
        f"/api/courses/{course['id']}/learning-outcomes",
        json={
            "code": "LO1",
            "description": "Understand core machine learning concepts",
            "bloom_level": "understand",
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()["data"]
    assert created["course_id"] == course["id"]
    assert created["code"] == "LO1"
    assert created["bloom_level"] == "understand"

    duplicate_response = await client.post(
        f"/api/courses/{course['id']}/learning-outcomes",
        json={
            "code": "LO1",
            "description": "Duplicate learning outcome",
        },
    )
    assert duplicate_response.status_code == 409

    list_response = await client.get(f"/api/courses/{course['id']}/learning-outcomes")
    assert list_response.status_code == 200
    assert any(item["code"] == "LO1" for item in list_response.json()["data"])

    update_response = await client.put(
        f"/api/learning-outcomes/{created['id']}",
        json={
            "description": "Apply core machine learning concepts",
            "bloom_level": "apply",
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()["data"]
    assert updated["description"] == "Apply core machine learning concepts"
    assert updated["bloom_level"] == "apply"

    delete_response = await client.delete(f"/api/learning-outcomes/{created['id']}")
    assert delete_response.status_code == 200
    assert delete_response.json()["data"]["id"] == created["id"]

    missing_response = await client.put(
        f"/api/learning-outcomes/{created['id']}",
        json={"description": "Missing"},
    )
    assert missing_response.status_code == 404


@pytest.mark.asyncio
async def test_create_learning_outcome_for_missing_course_returns_404(client):
    response = await client.post(
        "/api/courses/999999/learning-outcomes",
        json={
            "code": "LO404",
            "description": "This course does not exist",
            "bloom_level": "understand",
        },
    )
    assert response.status_code == 404
