"""Shared FastAPI dependencies."""

from src.repositories.database import get_db

__all__ = ["get_db"]

