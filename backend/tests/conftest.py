import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Sync test client — no real DB needed for foundation tests."""
    return TestClient(app, raise_server_exceptions=False)
