import pytest


async def _create_course(client, code: str, headers: dict):
    response = await client.post(
        "/api/courses",
        json={
            "code": code,
            "name": f"{code} Course",
            "description": "Document reuse test course",
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["data"]


async def _upload_docx(client, course_id: int, file_name: str, headers: dict, document_type: str = "lecture"):
    response = await client.post(
        "/api/documents/upload",
        data={"course_id": str(course_id), "document_type": document_type},
        files={
            "file": (
                file_name,
                b"small docx placeholder for upload metadata tests",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["data"]


@pytest.mark.asyncio
async def test_list_documents_filters_by_course_id(client, auth_headers):
    course_a = await _create_course(client, "DOC-A", auth_headers)
    course_b = await _create_course(client, "DOC-B", auth_headers)
    uploaded_a = await _upload_docx(client, course_a["id"], "a.docx", auth_headers)
    await _upload_docx(client, course_b["id"], "b.docx", auth_headers)

    response = await client.get(f"/api/documents?course_id={course_a['id']}", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 1
    assert data["items"][0]["id"] == uploaded_a["id"]
    assert data["items"][0]["course_id"] == course_a["id"]


@pytest.mark.asyncio
async def test_list_documents_filters_by_status(client, auth_headers):
    course = await _create_course(client, "DOC-STATUS", auth_headers)
    uploaded = await _upload_docx(client, course["id"], "status.docx", auth_headers)

    response = await client.get(f"/api/documents?course_id={course['id']}&status=uploaded", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 1
    assert data["items"][0]["id"] == uploaded["id"]
    assert data["items"][0]["status"] == "uploaded"


@pytest.mark.asyncio
async def test_list_documents_pagination(client, auth_headers):
    course = await _create_course(client, "DOC-PAGE", auth_headers)
    await _upload_docx(client, course["id"], "first.docx", auth_headers)
    second = await _upload_docx(client, course["id"], "second.docx", auth_headers)

    response = await client.get(f"/api/documents?course_id={course['id']}&limit=1&offset=0", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 2
    assert data["limit"] == 1
    assert data["offset"] == 0
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == second["id"]


@pytest.mark.asyncio
async def test_list_documents_rejects_invalid_filters(client, auth_headers):
    invalid_status = await client.get("/api/documents?status=archived", headers=auth_headers)
    assert invalid_status.status_code == 400
    assert invalid_status.json() == {
        "error": "Invalid request",
        "detail": "status must be one of: uploaded, processing, processed, failed",
    }

    invalid_type = await client.get("/api/documents?document_type=slides", headers=auth_headers)
    assert invalid_type.status_code == 400
    assert invalid_type.json()["error"] == "Invalid request"

    invalid_limit = await client.get("/api/documents?limit=101", headers=auth_headers)
    assert invalid_limit.status_code == 400
    assert invalid_limit.json()["detail"] == "limit must be between 1 and 100"

    invalid_offset = await client.get("/api/documents?offset=-1", headers=auth_headers)
    assert invalid_offset.status_code == 400
    assert invalid_offset.json()["detail"] == "offset must be greater than or equal to 0"


@pytest.mark.asyncio
async def test_document_isolation(client, auth_headers, auth_headers_other):
    # 1. User A creates a course and uploads a document
    course_a = await _create_course(client, "DOC-ISO", auth_headers)
    uploaded_a = await _upload_docx(client, course_a["id"], "a_iso.docx", auth_headers)

    # 2. User B tries to upload a document to User A's course - should be 404
    post_b = await client.post(
        "/api/documents/upload",
        data={"course_id": str(course_a["id"]), "document_type": "lecture"},
        files={
            "file": (
                "b.docx",
                b"small docx for User B hack attempt",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers=auth_headers_other,
    )
    assert post_b.status_code == 404

    # 3. User B tries to list documents - should not see User A's document
    list_b = await client.get("/api/documents", headers=auth_headers_other)
    assert list_b.status_code == 200
    assert not any(doc["id"] == uploaded_a["id"] for doc in list_b.json()["data"]["items"])

    # 4. User B tries to view User A's document detail - should be 404
    get_b = await client.get(f"/api/documents/{uploaded_a['id']}", headers=auth_headers_other)
    assert get_b.status_code == 404

    # 5. User B tries to trigger extraction of User A's document - should be 404
    extract_b = await client.post(f"/api/documents/{uploaded_a['id']}/extract", headers=auth_headers_other)
    assert extract_b.status_code == 404

    # 6. User B tries to get chunks of User A's document - should be 404
    chunks_b = await client.get(f"/api/documents/{uploaded_a['id']}/chunks", headers=auth_headers_other)
    assert chunks_b.status_code == 404
