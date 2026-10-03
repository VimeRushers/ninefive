from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from app.api.search import _fit_score
from app.core.database import get_db
from app.main import app
from app.models.tender import Tender
from fastapi.testclient import TestClient


def test_fit_score_from_distance():
    assert _fit_score(0.2, False) == 0.8


def test_fit_score_has_floor():
    assert _fit_score(1.0, False) == 0.05


def test_search_tenders_endpoint():
    t1 = Tender(
        id=1,
        ocds_id="ocds-1",
        title="Laptopuri si calculatoare",
        description="Furnizare laptopuri performante",
        buyer_name="Ministerul Educatiei",
        estimated_amount=250000.0,
        currency="MDL",
        published_at=datetime.now(timezone.utc),
        cpv_codes=["30213100-6"],
    )
    t1.chunks = []
    t1.documents = []

    async def override_get_db():
        session = MagicMock()
        count_result = MagicMock()
        count_result.scalar_one.return_value = 1
        rows_result = MagicMock()
        rows_result.all.return_value = [(t1, 0.2)]
        chunks_result = MagicMock()
        chunks_result.all.return_value = []
        session.execute = AsyncMock(
            side_effect=[count_result, rows_result, chunks_result]
        )
        yield session

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)

    res = test_client.get("/search?q=laptopuri")
    app.dependency_overrides.clear()

    assert res.status_code == 200
    data = res.json()
    assert data["query"] == "laptopuri"
    assert len(data["results"]) == 1
    assert data["results"][0]["tender_id"] == "1"
    assert data["results"][0]["title"] == "Laptopuri si calculatoare"
    assert data["results"][0]["fit_score"] > 0


def test_get_board_endpoint():
    t1 = Tender(
        id=1,
        ocds_id="ocds-1",
        title="Laptopuri",
        buyer_name="Ministerul Educatiei",
        estimated_amount=250000.0,
        currency="MDL",
        published_at=datetime.now(timezone.utc),
        cpv_codes=["30213100-6"],
    )
    t1.awards = []
    t1.documents = []

    async def override_get_db():
        session = MagicMock()
        profile_result = MagicMock()
        profile_result.scalar_one_or_none.return_value = None
        tenders_result = MagicMock()
        tenders_result.scalars.return_value.all.return_value = [t1]
        entries_result = MagicMock()
        entries_result.scalars.return_value.all.return_value = []
        changes_result = MagicMock()
        changes_result.scalars.return_value.all.return_value = []
        session.execute = AsyncMock(
            side_effect=[profile_result, tenders_result, entries_result, changes_result]
        )
        yield session

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)

    res = test_client.get("/board?profile_id=1")
    app.dependency_overrides.clear()

    assert res.status_code == 200
    data = res.json()
    assert data["profile_id"] == 1
    assert len(data["cards"]) == 1
    assert data["cards"][0]["tender_id"] == "1"
    assert data["cards"][0]["stage"] == "new"


def test_move_card_endpoint():
    t1 = Tender(
        id=1,
        ocds_id="ocds-1",
        title="Laptopuri",
        buyer_name="Ministerul Educatiei",
        estimated_amount=250000.0,
        currency="MDL",
        published_at=datetime.now(timezone.utc),
    )

    async def override_get_db():
        session = MagicMock()
        tender_result = MagicMock()
        tender_result.scalar_one_or_none.return_value = t1
        entry_result = MagicMock()
        entry_result.scalar_one_or_none.return_value = None
        history_result = MagicMock()
        history_result.scalars.return_value.all.return_value = []
        session.execute = AsyncMock(
            side_effect=[tender_result, entry_result, history_result]
        )
        session.add = MagicMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()
        yield session

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)

    res = test_client.patch(
        "/board/ocds-1?profile_id=1", json={"stage": "questionable"}
    )
    app.dependency_overrides.clear()

    assert res.status_code == 200
    data = res.json()
    assert data["tender_id"] == "1"
    assert data["stage"] == "questionable"
    assert data["stage_source"] == "manual"
