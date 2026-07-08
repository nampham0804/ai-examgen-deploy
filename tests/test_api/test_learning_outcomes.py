import pytest


@pytest.mark.asyncio
async def test_learning_outcome_crud_flow(client, auth_headers):
    course_response = await client.post(
        "/api/courses",
        json={
            "code": "CS499",
            "name": "Learning Outcome Test Course",
            "description": "Course used for LO CRUD tests",
        },
        headers=auth_headers,
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
        headers=auth_headers,
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
        headers=auth_headers,
    )
    assert duplicate_response.status_code == 409

    list_response = await client.get(f"/api/courses/{course['id']}/learning-outcomes", headers=auth_headers)
    assert list_response.status_code == 200
    assert any(item["code"] == "LO1" for item in list_response.json()["data"])

    update_response = await client.put(
        f"/api/learning-outcomes/{created['id']}",
        json={
            "description": "Apply core machine learning concepts",
            "bloom_level": "apply",
        },
        headers=auth_headers,
    )
    assert update_response.status_code == 200
    updated = update_response.json()["data"]
    assert updated["description"] == "Apply core machine learning concepts"
    assert updated["bloom_level"] == "apply"

    delete_response = await client.delete(f"/api/learning-outcomes/{created['id']}", headers=auth_headers)
    assert delete_response.status_code == 200
    assert delete_response.json()["data"]["id"] == created["id"]

    missing_response = await client.put(
        f"/api/learning-outcomes/{created['id']}",
        json={"description": "Missing"},
        headers=auth_headers,
    )
    assert missing_response.status_code == 404


@pytest.mark.asyncio
async def test_create_learning_outcome_for_missing_course_returns_404(client, auth_headers):
    response = await client.post(
        "/api/courses/999999/learning-outcomes",
        json={
            "code": "LO404",
            "description": "This course does not exist",
            "bloom_level": "understand",
        },
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_learning_outcome_isolation(client, auth_headers, auth_headers_other):
    # 1. User A creates a course and a learning outcome
    course_a = (await client.post(
        "/api/courses",
        json={"code": "CSA", "name": "Course A"},
        headers=auth_headers,
    )).json()["data"]

    lo_a = (await client.post(
        f"/api/courses/{course_a['id']}/learning-outcomes",
        json={"code": "LOA", "description": "LO A description"},
        headers=auth_headers,
    )).json()["data"]

    # 2. User B tries to create a learning outcome under User A's course - should be 404
    post_b = await client.post(
        f"/api/courses/{course_a['id']}/learning-outcomes",
        json={"code": "LOB", "description": "LO B description"},
        headers=auth_headers_other,
    )
    assert post_b.status_code == 404

    # 3. User B tries to list learning outcomes under User A's course - should be 404
    list_b = await client.get(
        f"/api/courses/{course_a['id']}/learning-outcomes",
        headers=auth_headers_other,
    )
    assert list_b.status_code == 404

    # 4. User B tries to update User A's learning outcome - should be 404
    put_b = await client.put(
        f"/api/learning-outcomes/{lo_a['id']}",
        json={"description": "Hacked description"},
        headers=auth_headers_other,
    )
    assert put_b.status_code == 404

    # 5. User B tries to delete User A's learning outcome - should be 404
    delete_b = await client.delete(
        f"/api/learning-outcomes/{lo_a['id']}",
        headers=auth_headers_other,
    )
    assert delete_b.status_code == 404
