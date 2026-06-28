from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.schemas.auth import TokenResponse, UserLogin, UserRegister, UserResponse
from src.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=dict)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    user = auth_service.register_user(db, payload)
    return {
        "data": UserResponse.model_validate(user),
        "message": "User registered",
    }


@router.post("/login", response_model=dict)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    session = auth_service.login_user(db, payload)
    return {
        "data": TokenResponse.model_validate(session),
        "message": "Login successful",
    }


@router.get("/me", response_model=dict)
def me(current_user=Depends(get_current_user)):
    return {
        "data": UserResponse.model_validate(current_user),
        "message": "Current user loaded",
    }
