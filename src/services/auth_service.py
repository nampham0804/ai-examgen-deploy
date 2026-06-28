from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.repositories import user_repository
from src.schemas.auth import UserLogin, UserRegister
from src.security import create_access_token, hash_password, verify_password


def register_user(db: Session, payload: UserRegister):
    existing_user = user_repository.get_user_by_email(db, payload.email)
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "Conflict", "detail": "Email already exists"},
        )

    return user_repository.create_user(db, payload, hashed_password=hash_password(payload.password))


def login_user(db: Session, payload: UserLogin):
    user = user_repository.get_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Unauthorized", "detail": "Invalid email or password"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Forbidden", "detail": "User account is inactive"},
        )

    return {
        "access_token": create_access_token(subject=str(user.id)),
        "token_type": "bearer",
        "user": user,
    }
