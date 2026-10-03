from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from app.core.database import get_db
from app.main import app
from app.models.board import BoardEntry
from app.models.tender import Tender
from fastapi.testclient import TestClient


def _tender() -> Tender:
    tender = Tender(
        id=1,
        ocds_id="ocds-1",
        title="Laptopuri",
        buyer_name="Ministerul Educatiei",
        estimated_amount=250000.0,
        currency="MDL",
        published_at=datetime.now(timezone.utc),
    )
    tender.awards = []
    tender.documents = []
    return tender


def _patch_session(entry=None):
    tender_result = MagicMock()
    tender_result.scalar_one_or_none.return_value = _tender()
    entry_result = MagicMock()
    entry_result.scalar_one_or_none.return_value = entry
    history_result = MagicMock()
    history_result.scalars.return_value.all.return_value = []

    async def override_get_db():
        session = MagicMock()
        session.execute = AsyncMock(
            side_effect=[tender_result, entry_result, history_result]
        )
        session.add = MagicMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()
        yield session

    return override_get_db


def test_move_card_updates_existing_entry():
    entry = BoardEntry(
        id=5, profile_id=1, tender_id=1, stage="new", stage_source="auto"
    )

    app.dependency_overrides[get_db] = _patch_session(entry)
    try:
        res = TestClient(app).patch("/board/ocds-1?profile_id=1", json={"stage": "won"})
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    assert entry.stage == "won"
    assert entry.stage_source == "manual"
    assert res.json()["stage"] == "won"


def test_move_card_creates_missing_entry():
    app.dependency_overrides[get_db] = _patch_session(None)
    try:
        res = TestClient(app).patch("/board/ocds-1?profile_id=1", json={"stage": "lost"})
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    assert res.json()["stage"] == "lost"
    assert res.json()["stage_source"] == "manual"


def test_get_board_uses_persisted_stage():
    entry = BoardEntry(
        id=5,
        profile_id=1,
        tender_id=1,
        stage="questionable",
        stage_source="manual",
        stage_reason="missing documents",
    )

    profile_result = MagicMock()
    profile_result.scalar_one_or_none.return_value = None
    tenders_result = MagicMock()
    tenders_result.scalars.return_value.all.return_value = [_tender()]
    entries_result = MagicMock()
    entries_result.scalars.return_value.all.return_value = [entry]
    changes_result = MagicMock()
    changes_result.scalars.return_value.all.return_value = []

    async def override_get_db():
        session = MagicMock()
        session.execute = AsyncMock(
            side_effect=[profile_result, tenders_result, entries_result, changes_result]
        )
        yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        res = TestClient(app).get("/board?profile_id=1")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    card = res.json()["cards"][0]
    assert card["stage"] == "questionable"
    assert card["stage_source"] == "manual"
