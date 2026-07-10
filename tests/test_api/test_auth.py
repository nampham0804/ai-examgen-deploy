import pytest


@pytest.mark.asyncio
async def test_register_user_success(client):
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "teacher@example.com",
            "password": "Password123",
            "full_name": "Teacher One",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["message"] == "User registered"
    assert body["data"]["email"] == "teacher@example.com"
    assert body["data"]["full_name"] == "Teacher One"
    assert "hashed_password" not in body["data"]


@pytest.mark.asyncio
async def test_register_duplicate_email_rejected(client):
    payload = {
        "email": "teacher@example.com",
        "password": "Password123",
        "full_name": "Teacher One",
    }

    first_response = await client.post("/api/auth/register", json=payload)
    duplicate_response = await client.post("/api/auth/register", json=payload)

    assert first_response.status_code == 201
    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["detail"] == "Email already exists"


@pytest.mark.asyncio
async def test_login_success_returns_token(client):
    await client.post(
        "/api/auth/register",
        json={
            "email": "teacher@example.com",
            "password": "Password123",
            "full_name": "Teacher One",
        },
    )

    response = await client.post(
        "/api/auth/login",
        json={"email": "teacher@example.com", "password": "Password123"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["access_token"]
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "teacher@example.com"


@pytest.mark.asyncio
async def test_login_wrong_password_rejected(client):
    await client.post(
        "/api/auth/register",
        json={
            "email": "teacher@example.com",
            "password": "Password123",
            "full_name": "Teacher One",
        },
    )

    response = await client.post(
        "/api/auth/login",
        json={"email": "teacher@example.com", "password": "WrongPassword"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


@pytest.mark.asyncio
async def test_me_requires_token(client):
    response = await client.get("/api/auth/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_current_user(client):
    await client.post(
        "/api/auth/register",
        json={
            "email": "teacher@example.com",
            "password": "Password123",
            "full_name": "Teacher One",
        },
    )
    login_response = await client.post(
        "/api/auth/login",
        json={"email": "teacher@example.com", "password": "Password123"},
    )
    token = login_response.json()["data"]["access_token"]

    response = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["data"]["email"] == "teacher@example.com"


@pytest.mark.asyncio
async def test_login_inactive_user_rejected(client):
    from src.repositories.database import SessionLocal
    from src.models.user import User

    await client.post(
        "/api/auth/register",
        json={
            "email": "inactive@example.com",
            "password": "Password123",
            "full_name": "Inactive User",
        },
    )

    with SessionLocal() as db:
        user_row = db.query(User).filter(User.email == "inactive@example.com").first()
        user_row.is_active = False
        db.commit()

    response = await client.post(
        "/api/auth/login",
        json={"email": "inactive@example.com", "password": "Password123"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "User account is inactive"



@pytest.mark.asyncio
async def test_login_invalid_hash_does_not_crash(client):
    from src.repositories.database import SessionLocal
    from src.models.user import User

    await client.post(
        "/api/auth/register",
        json={
            "email": "badhash@example.com",
            "password": "Password123",
            "full_name": "Bad Hash User",
        },
    )

    with SessionLocal() as db:
        user_row = db.query(User).filter(User.email == "badhash@example.com").first()
        user_row.hashed_password = "invalid_password_hash_format"
        db.commit()

    response = await client.post(
        "/api/auth/login",
        json={"email": "badhash@example.com", "password": "Password123"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_init_db_production_no_seed():
    import os
    from src.config import get_settings
    from src.repositories.database import init_db, SessionLocal
    from src.models.user import User

    # Temporarily set APP_ENV to production and clear settings cache
    old_env = os.environ.get("APP_ENV")
    os.environ["APP_ENV"] = "production"
    get_settings.cache_clear()

    # Clear user 1 if it was seeded
    with SessionLocal() as db:
        u = db.get(User, 1)
        if u is not None:
            db.delete(u)
            db.commit()

    try:
        init_db()
        with SessionLocal() as db:
            assert db.get(User, 1) is None
    finally:
        # Restore environment and clear settings cache
        if old_env:
            os.environ["APP_ENV"] = old_env
        else:
            del os.environ["APP_ENV"]
        get_settings.cache_clear()

