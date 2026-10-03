from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

from app.core.database import get_db
from app.main import app
from app.models.award import Award
from app.models.buyer import Buyer
from app.models.tender import Tender
from fastapi.testclient import TestClient


def test_get_tender_analysis():
    now = datetime(2026, 10, 1, 10, 0, tzinfo=timezone.utc)
    tender = Tender(
        id=1,
        ocds_id="ocds-test-1",
        title="Achizitie computere",
        description="Achizitie computere Dell pentru birouri",
        buyer_id=1,
        buyer_name="Primaria",
        estimated_amount=100000.0,
        currency="MDL",
        published_at=now,
        submission_deadline=now + timedelta(days=5),
        cpv_codes=["30200000-1"],
    )
    tender.buyer = Buyer(id=1, name="Primaria")
    tender.awards = [Award(tender_id=1, supplier_name="MegaCorp", value=95000.0)]
    tender.documents = []
    tender.chunks = []

    async def override_get_db():
        session = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.side_effect = [
            tender,
            None,
            None,
        ]  # tender, cache, profile
        mock_result.scalars.return_value.all.return_value = [tender]
        session.execute = AsyncMock(return_value=mock_result)
        session.add = MagicMock()
        session.commit = AsyncMock()
        session.rollback = AsyncMock()
        yield session

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)

    res = test_client.get("/tenders/ocds-test-1/analysis")
    app.dependency_overrides.clear()

    assert res.status_code == 200
    data = res.json()
    assert data["tender_id"] == "1"
    assert len(data["red_flags"]) >= 3
    # Short deadline should be triggered
    short_flag = next(
        f for f in data["red_flags"] if f["indicator"] == "short_submission_window"
    )
    assert short_flag["triggered"] is True
    assert data["eligibility"] is not None
    assert len(data["eligibility"]["items"]) > 0
    assert data["win_chance"] is not None


def test_get_tender_detail():
    now = datetime(2026, 10, 1, 10, 0, tzinfo=timezone.utc)
    tender = Tender(
        id=1,
        ocds_id="ocds-test-1",
        title="Achizitie computere",
        description="Achizitie computere Dell",
        buyer_id=1,
        buyer_name="Primaria",
        estimated_amount=100000.0,
        currency="MDL",
        published_at=now,
        submission_deadline=now + timedelta(days=15),
        cpv_codes=["30200000-1"],
    )
    tender.buyer = Buyer(id=1, name="Primaria")
    tender.documents = []

    async def override_get_db():
        session = MagicMock()
        tender_result = MagicMock()
        tender_result.scalar_one_or_none.return_value = tender
        changes_result = MagicMock()
        changes_result.scalars.return_value.all.return_value = []
        summary_result = MagicMock()
        summary_result.scalar_one_or_none.return_value = None
        session.execute = AsyncMock(
            side_effect=[tender_result, changes_result, summary_result]
        )
        session.add = MagicMock()
        session.commit = AsyncMock()
        session.rollback = AsyncMock()
        yield session

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)

    res = test_client.get("/tenders/ocds-test-1")
    app.dependency_overrides.clear()

    assert res.status_code == 200
    data = res.json()
    assert data["tender_id"] == "1"
    assert data["title"] == "Achizitie computere"
    assert data["estimated_value"]["amount"] == 100000.0
