from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from app.core.database import get_db
from app.main import app
from app.models.board import BoardEntry
from app.models.tender import Tender
from fastapi.testclient import TestClient


def _tender(
    tender_id: int,
    title: str,
    published: datetime | None,
    amount: float | None = None,
    region: str | None = None,
    cpv: list[str] | None = None,
) -> Tender:
    tender = Tender(
        id=tender_id,
        ocds_id=f"ocds-{tender_id}",
        title=title,
        description=title,
        buyer_name="Buyer",
        estimated_amount=amount,
        currency="MDL",
        published_at=published,
        updated_at=published,
        region=region,
        cpv_codes=cpv or [],
    )
    tender.awards = []
    tender.documents = []
    return tender


def _get_board(tenders, query, entries=None):
    profile_result = MagicMock()
    profile_result.scalar_one_or_none.return_value = None
    tenders_result = MagicMock()
    tenders_result.scalars.return_value.all.return_value = tenders
    entries_result = MagicMock()
    entries_result.scalars.return_value.all.return_value = entries or []

    async def override_get_db():
        session = MagicMock()
        session.execute = AsyncMock(
            side_effect=[profile_result, tenders_result, entries_result]
        )
        yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        res = TestClient(app).get(f"/board?{query}")
    finally:
        app.dependency_overrides.clear()
    return res


NOW = datetime(2026, 5, 20, tzinfo=timezone.utc)


def test_query_matches_without_diacritics():
    tenders = [_tender(1, "Achiziționarea de laptopuri", NOW)]

    res = _get_board(tenders, "q=achizitionarea laptopuri")

    assert res.status_code == 200
    assert len(res.json()["cards"]) == 1


def test_query_excludes_when_word_missing():
    tenders = [_tender(1, "Achiziționarea de laptopuri", NOW)]

    res = _get_board(tenders, "q=imprimante")

    assert res.json()["cards"] == []


def test_published_range_excludes_outside():
    tenders = [
        _tender(1, "Inside", datetime(2026, 5, 10, tzinfo=timezone.utc)),
        _tender(2, "Outside", datetime(2026, 1, 1, tzinfo=timezone.utc)),
    ]

    res = _get_board(tenders, "published_from=2026-05-01&published_to=2026-05-31")

    ids = [card["tender_id"] for card in res.json()["cards"]]
    assert ids == ["1"]


def test_missing_published_excluded_when_range_set():
    tenders = [_tender(1, "No date", None)]

    res = _get_board(tenders, "published_from=2026-01-01")

    assert res.json()["cards"] == []


def test_price_bound_excludes_missing_amount():
    tenders = [_tender(1, "No amount", NOW, amount=None)]

    res = _get_board(tenders, "price_max=10000")

    assert res.json()["cards"] == []


def test_region_filter():
    tenders = [
        _tender(1, "Chisinau", NOW, region="mun. Chișinău"),
        _tender(2, "Balti", NOW, region="mun. Bălți"),
    ]

    res = _get_board(tenders, "region=mun. B%C4%83l%C8%9Bi")

    ids = [card["tender_id"] for card in res.json()["cards"]]
    assert ids == ["2"]


def test_tag_filter():
    tenders = [_tender(1, "Laptop", NOW, cpv=["30213100-6"])]

    assert len(_get_board(tenders, "tags=IT").json()["cards"]) == 1
    assert _get_board(tenders, "tags=Construction").json()["cards"] == []


def test_stage_filter_uses_persisted_entry():
    tenders = [_tender(1, "Laptop", NOW)]
    entry = BoardEntry(id=1, profile_id=1, tender_id=1, stage="won", stage_source="manual")

    res = _get_board(tenders, "stages=won", entries=[entry])

    cards = res.json()["cards"]
    assert len(cards) == 1
    assert cards[0]["stage"] == "won"

    assert _get_board(tenders, "stages=lost", entries=[entry]).json()["cards"] == []


def test_win_min_excludes_low_probability():
    tenders = [_tender(1, "Laptop", NOW)]

    res = _get_board(tenders, "win_min=0.9")

    assert res.json()["cards"] == []


def test_eligibility_max_excludes_high_score():
    tenders = [_tender(1, "Laptop", NOW)]

    res = _get_board(tenders, "eligibility_max=0.5")

    assert res.json()["cards"] == []
