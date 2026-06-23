import pytest


@pytest.mark.asyncio
async def test_course_crud_flow(client):
    create_response = await client.post(
        "/api/courses",
        json={
            "code": "CS401",
            "name": "Machine Learning",
            "description": "Introductory machine learning course",
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()["data"]
    assert created["code"] == "CS401"

    duplicate_response = await client.post(
        "/api/courses",
        json={"code": "CS401", "name": "Duplicate"},
    )
    assert duplicate_response.status_code == 409

    list_response = await client.get("/api/courses")
    assert list_response.status_code == 200
    assert any(course["code"] == "CS401" for course in list_response.json()["data"])

    update_response = await client.put(
        f"/api/courses/{created['id']}",
        json={"name": "Machine Learning Updated"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["data"]["name"] == "Machine Learning Updated"

    delete_response = await client.delete(f"/api/courses/{created['id']}")
    assert delete_response.status_code == 200
    assert delete_response.json()["data"]["id"] == created["id"]

    missing_response = await client.get(f"/api/courses/{created['id']}")
    assert missing_response.status_code == 404
