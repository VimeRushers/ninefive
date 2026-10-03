from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from app.core.database import get_db
from app.main import app
from app.models.profile import CompanyProfile
from fastapi.testclient import TestClient


def test_lookup_company(client: TestClient):
    res = client.get("/profile/lookup?idno=1003600012345")
    assert res.status_code == 200
    data = res.json()
    assert data["idno"] == "1003600012345"
    assert "name" in data


def test_create_profile_with_mock_db():
    async def override_get_db():
        session = MagicMock()
        session.add = MagicMock()
        session.commit = AsyncMock()

        async def mock_refresh(obj):
            obj.id = 1
            obj.created_at = datetime.now(timezone.utc)
            obj.updated_at = datetime.now(timezone.utc)

        session.refresh = mock_refresh
        yield session

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)

    payload = {
        "idno": "1003600012345",
        "name": "Test SRL",
        "description": "IT development services",
        "cpv_codes": ["72000000-5"],
        "regions": ["Chișinău"],
        "budget_min": 1000.0,
        "budget_max": 500000.0,
        "annual_turnover": {"amount": 2000000.0, "currency": "MDL"},
        "employee_count": 15,
        "licenses": ["Licenta IT"],
        "certifications": ["ISO 9001"],
    }

    res = test_client.post("/profile", json=payload)
    app.dependency_overrides.clear()

    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Test SRL"
    assert data["id"] == 1
    assert data["cpv_codes"] == ["72000000-5"]
