import os
from unittest.mock import AsyncMock

os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite:///./tmp/test.db"

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from src.main import app
from src.models import course, document, document_chunk, learning_outcome, question, user  # noqa: F401
from src.repositories.database import Base, engine, init_db


@pytest_asyncio.fixture
async def client():
    """Async HTTP client for testing API endpoints."""
    Base.metadata.drop_all(bind=engine)
    init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_llm():
    """Mock LLM to avoid calling OpenAI during tests.

    Usage in test:
        def test_something(mock_llm):
            # LLM calls will return mock response instead of hitting OpenAI
            ...
    """
    mock = AsyncMock()
    mock.ainvoke.return_value = AsyncMock(content="Mocked LLM response")
    return mock
