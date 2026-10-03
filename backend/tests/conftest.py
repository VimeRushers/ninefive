import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.embedder import embedder
from app.main import app


@pytest.fixture(autouse=True)
def _offline(monkeypatch):
    """Keep tests offline and fast: no DeepSeek calls, no model loading."""
    monkeypatch.setattr(settings, "deepseek_api_key", "")
    monkeypatch.setattr(embedder, "_model", None)
    monkeypatch.setattr(embedder, "_model_loaded", True)


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Sync test client — no real DB needed for foundation tests."""
    return TestClient(app, raise_server_exceptions=False)
