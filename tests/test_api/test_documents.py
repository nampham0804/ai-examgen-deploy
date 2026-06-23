import pytest


async def _create_course(client, code: str):
    response = await client.post(
        "/api/courses",
        json={
            "code": code,
            "name": f"{code} Course",
            "description": "Document reuse test course",
        },
    )
    assert response.status_code == 201
    return response.json()["data"]


async def _upload_docx(client, course_id: int, file_name: str, document_type: str = "lecture"):
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
    )
    assert response.status_code == 201
    return response.json()["data"]


@pytest.mark.asyncio
async def test_list_documents_filters_by_course_id(client):
    course_a = await _create_course(client, "DOC-A")
    course_b = await _create_course(client, "DOC-B")
    uploaded_a = await _upload_docx(client, course_a["id"], "a.docx")
    await _upload_docx(client, course_b["id"], "b.docx")

    response = await client.get(f"/api/documents?course_id={course_a['id']}")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 1
    assert data["items"][0]["id"] == uploaded_a["id"]
    assert data["items"][0]["course_id"] == course_a["id"]


@pytest.mark.asyncio
async def test_list_documents_filters_by_status(client):
    course = await _create_course(client, "DOC-STATUS")
    uploaded = await _upload_docx(client, course["id"], "status.docx")

    response = await client.get(f"/api/documents?course_id={course['id']}&status=uploaded")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 1
    assert data["items"][0]["id"] == uploaded["id"]
    assert data["items"][0]["status"] == "uploaded"


@pytest.mark.asyncio
async def test_list_documents_pagination(client):
    course = await _create_course(client, "DOC-PAGE")
    await _upload_docx(client, course["id"], "first.docx")
    second = await _upload_docx(client, course["id"], "second.docx")

    response = await client.get(f"/api/documents?course_id={course['id']}&limit=1&offset=0")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 2
    assert data["limit"] == 1
    assert data["offset"] == 0
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == second["id"]


@pytest.mark.asyncio
async def test_list_documents_rejects_invalid_filters(client):
    invalid_status = await client.get("/api/documents?status=archived")
    assert invalid_status.status_code == 400
    assert invalid_status.json() == {
        "error": "Invalid request",
        "detail": "status must be one of: uploaded, processing, processed, failed",
    }

    invalid_type = await client.get("/api/documents?document_type=slides")
    assert invalid_type.status_code == 400
    assert invalid_type.json()["error"] == "Invalid request"

    invalid_limit = await client.get("/api/documents?limit=101")
    assert invalid_limit.status_code == 400
    assert invalid_limit.json()["detail"] == "limit must be between 1 and 100"

    invalid_offset = await client.get("/api/documents?offset=-1")
    assert invalid_offset.status_code == 400
    assert invalid_offset.json()["detail"] == "offset must be greater than or equal to 0"
