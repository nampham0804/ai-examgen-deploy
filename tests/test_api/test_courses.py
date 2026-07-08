import pytest


@pytest.mark.asyncio
async def test_course_crud_flow(client, auth_headers):
    create_response = await client.post(
        "/api/courses",
        json={
            "code": "CS401",
            "name": "Machine Learning",
            "description": "Introductory machine learning course",
        },
        headers=auth_headers,
    )
    assert create_response.status_code == 201
    created = create_response.json()["data"]
    assert created["code"] == "CS401"

    duplicate_response = await client.post(
        "/api/courses",
        json={"code": "CS401", "name": "Duplicate"},
        headers=auth_headers,
    )
    assert duplicate_response.status_code == 409

    list_response = await client.get("/api/courses", headers=auth_headers)
    assert list_response.status_code == 200
    assert any(course["code"] == "CS401" for course in list_response.json()["data"])

    update_response = await client.put(
        f"/api/courses/{created['id']}",
        json={"name": "Machine Learning Updated"},
        headers=auth_headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["data"]["name"] == "Machine Learning Updated"

    delete_response = await client.delete(f"/api/courses/{created['id']}", headers=auth_headers)
    assert delete_response.status_code == 200
    assert delete_response.json()["data"]["id"] == created["id"]

    missing_response = await client.get(f"/api/courses/{created['id']}", headers=auth_headers)
    assert missing_response.status_code == 404


@pytest.mark.asyncio
async def test_course_isolation(client, auth_headers, auth_headers_other):
    create_a = await client.post(
        "/api/courses",
        json={
            "code": "CS101",
            "name": "User A Course",
        },
        headers=auth_headers,
    )
    assert create_a.status_code == 201
    course_a = create_a.json()["data"]

    list_b = await client.get("/api/courses", headers=auth_headers_other)
    assert list_b.status_code == 200
    assert not any(course["id"] == course_a["id"] for course in list_b.json()["data"])

    get_b = await client.get(f"/api/courses/{course_a['id']}", headers=auth_headers_other)
    assert get_b.status_code == 404

    put_b = await client.put(
        f"/api/courses/{course_a['id']}",
        json={"name": "Hacked name"},
        headers=auth_headers_other,
    )
    assert put_b.status_code == 404

    delete_b = await client.delete(f"/api/courses/{course_a['id']}", headers=auth_headers_other)
    assert delete_b.status_code == 404

    create_b = await client.post(
        "/api/courses",
        json={
            "code": "CS101",
            "name": "User B Course",
        },
        headers=auth_headers_other,
    )
    assert create_b.status_code == 201
    assert create_b.json()["data"]["code"] == "CS101"
