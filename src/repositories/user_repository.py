from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.user import User
from src.schemas.auth import UserRegister


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def create_user(db: Session, payload: UserRegister, hashed_password: str) -> User:
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hashed_password,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
