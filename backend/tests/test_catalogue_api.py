from unittest.mock import AsyncMock, MagicMock

from app.core.database import get_db
from app.main import app
from fastapi.testclient import TestClient


def _override_db(result_value):
    async def override_get_db():
        session = MagicMock()
        result = MagicMock()
        result.scalar_one_or_none = MagicMock(return_value=result_value)
        session.execute = AsyncMock(return_value=result)
        yield session

    return override_get_db


def test_list_catalogue_404_for_unknown_profile(client: TestClient):
    app.dependency_overrides[get_db] = _override_db(None)
    try:
        res = client.get("/profile/999/catalogue")
    finally:
        app.dependency_overrides.clear()
    assert res.status_code == 404


def test_update_catalogue_item_404(client: TestClient):
    app.dependency_overrides[get_db] = _override_db(None)
    try:
        res = client.patch(
            "/profile/1/catalogue/999", json={"name": "Nope"}
        )
    finally:
        app.dependency_overrides.clear()
    assert res.status_code == 404


def test_delete_catalogue_item_404(client: TestClient):
    app.dependency_overrides[get_db] = _override_db(None)
    try:
        res = client.delete("/profile/1/catalogue/999")
    finally:
        app.dependency_overrides.clear()
    assert res.status_code == 404
