from unittest.mock import AsyncMock, MagicMock

from app.core.database import get_db
from app.main import app
from app.models.award import Award
from app.models.buyer import Buyer
from app.models.tender import Tender
from fastapi.testclient import TestClient


def test_get_buyer_profile_empty():
    async def override_get_db():
        session = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_result.scalars.return_value.all.return_value = []
        session.execute = AsyncMock(return_value=mock_result)
        yield session

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)

    res = test_client.get("/buyers/b-123/profile")
    app.dependency_overrides.clear()

    assert res.status_code == 200
    data = res.json()
    assert data["buyer_id"] == "b-123"
    assert data["total_tenders"] == 0
    assert data["top_winners"] == []


def test_get_buyer_profile_with_stats():
    t1 = Tender(id=1, buyer_ocds_id="b-1", buyer_name="Primaria")
    t1.awards = [
        Award(
            tender_id=1,
            supplier_name="Winner Corp",
            supplier_idno="1001",
            value=50000.0,
        )
    ]

    t2 = Tender(id=2, buyer_ocds_id="b-1", buyer_name="Primaria")
    t2.awards = [
        Award(
            tender_id=2,
            supplier_name="Winner Corp",
            supplier_idno="1001",
            value=30000.0,
        ),
        Award(
            tender_id=2, supplier_name="Other SRL", supplier_idno="1002", value=20000.0
        ),
    ]

    buyer = Buyer(id=1, ocds_id="b-1", name="Primaria", tenders=[t1, t2])

    async def override_get_db():
        session = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = buyer
        session.execute = AsyncMock(return_value=mock_result)
        yield session

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)

    res = test_client.get("/buyers/b-1/profile")
    app.dependency_overrides.clear()

    assert res.status_code == 200
    data = res.json()
    assert data["buyer_id"] == "b-1"
    assert data["total_tenders"] == 2
    assert data["single_bidder_rate"] == 0.5  # 1 of 2 tenders had 1 award
    assert data["repeat_winner_concentration"] == 2 / 3  # 2 of 3 awards
    assert len(data["top_winners"]) == 2
    assert data["top_winners"][0]["name"] == "Winner Corp"
    assert data["top_winners"][0]["contracts_won"] == 2
    assert data["top_winners"][0]["total_value"]["amount"] == 80000.0
