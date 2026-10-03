from unittest.mock import AsyncMock, MagicMock

from app.core.database import get_db
from app.main import app
from app.models.award import Award
from app.models.tender import Tender
from fastapi.testclient import TestClient


def test_competitors_fallback_without_participant_documents():
    tender = Tender(
        id=1,
        ocds_id="ocds-1",
        title="Laptopuri",
        estimated_amount=100000.0,
        currency="MDL",
    )
    tender.awards = [
        Award(
            id=1,
            tender_id=1,
            supplier_name="MegaCorp",
            value=95000.0,
            currency="MDL",
            status="active",
        )
    ]
    tender.documents = []
    tender.chunks = []

    async def override_get_db():
        session = MagicMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = tender
        session.execute = AsyncMock(return_value=result)
        yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        res = TestClient(app).get("/tenders/ocds-1/competitors")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    data = res.json()
    assert data["participants"][0]["name"] == "MegaCorp"
    assert data["lessons"]
