import pytest


async def _create_course(client, code: str, headers: dict):
    response = await client.post(
        "/api/courses",
        json={
            "code": code,
            "name": f"{code} Course",
            "description": "Retrieval test course",
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["data"]


async def _create_lo(client, course_id: int, code: str, headers: dict):
    response = await client.post(
        f"/api/courses/{course_id}/learning-outcomes",
        json={
            "code": code,
            "description": f"LO for {code}",
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["data"]


async def _upload_docx(client, course_id: int, file_name: str, headers: dict):
    response = await client.post(
        "/api/documents/upload",
        data={"course_id": str(course_id), "document_type": "lecture"},
        files={
            "file": (
                file_name,
                b"small docx placeholder for retrieval tests",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["data"]


@pytest.mark.asyncio
async def test_retrieval_chunks_requires_authentication(client):
    response = await client.post(
        "/api/retrieval/chunks",
        json={
            "document_id": 1,
            "learning_outcome_id": 1,
            "topic": "test",
            "top_k": 3,
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_retrieval_chunks_isolation(client, auth_headers, auth_headers_other):
    # 1. User A creates course, LO, and uploads document
    course_a = await _create_course(client, "RET-ISO-A", auth_headers)
    lo_a = await _create_lo(client, course_a["id"], "LO-A", auth_headers)
    doc_a = await _upload_docx(client, course_a["id"], "doc_a.docx", auth_headers)

    # 2. User B tries to retrieve chunks of User A's document or LO -> 404 Not Found
    response_b = await client.post(
        "/api/retrieval/chunks",
        json={
            "document_id": doc_a["id"],
            "learning_outcome_id": lo_a["id"],
            "topic": "test",
            "top_k": 3,
        },
        headers=auth_headers_other,
    )
    assert response_b.status_code == 404

    # 3. User A tries to retrieve chunks of their own document -> 400 Bad Request
    # (since the document status is 'uploaded', not 'processed')
    response_a = await client.post(
        "/api/retrieval/chunks",
        json={
            "document_id": doc_a["id"],
            "learning_outcome_id": lo_a["id"],
            "topic": "test",
            "top_k": 3,
        },
        headers=auth_headers,
    )
    assert response_a.status_code == 400
    assert "must be processed before retrieval" in response_a.json()["detail"]
