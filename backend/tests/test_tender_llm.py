from unittest.mock import AsyncMock

from app.api import tenders
from app.models.document import Document
from app.models.tender import Tender
from app.services.red_flags import ChunkRef


def _tender() -> Tender:
    tender = Tender(id=1, ocds_id="ocds-1", title="Laptopuri", description="Desc")
    tender.documents = [Document(id=7, ocds_id="d-7", tender_id=1, url="http://d/7", title="Caiet")]
    return tender


def _refs() -> list[ChunkRef]:
    return [
        ChunkRef(
            text="Cerinta tehnica",
            document_id="7",
            document_title="Caiet",
            page=3,
            url="http://d/7",
        )
    ]


async def test_summarize_tender_builds_citations(monkeypatch):
    monkeypatch.setattr(
        tenders,
        "complete_json",
        AsyncMock(
            return_value={
                "summary": [{"text": "Rezumat.", "document_id": 7, "page": 3}]
            }
        ),
    )

    summaries = await tenders._summarize_tender(_tender(), _refs(), AsyncMock())

    assert summaries[0].text == "Rezumat."
    assert summaries[0].citations[0].document_id == "7"
    assert summaries[0].citations[0].page == 3


async def test_summarize_tender_falls_back_without_llm(monkeypatch):
    monkeypatch.setattr(tenders, "complete_json", AsyncMock(return_value=None))

    summaries = await tenders._summarize_tender(_tender(), _refs(), AsyncMock())

    assert summaries[0].text == "Desc"
    assert summaries[0].citations[0].document_id == "ocds-1"


async def test_judge_cpv_returns_similarity(monkeypatch):
    monkeypatch.setattr(
        tenders,
        "complete_json",
        AsyncMock(return_value={"match": True, "similarity": 0.9, "reason": "ok"}),
    )

    labels, similarity = await tenders._judge_cpv(_tender(), AsyncMock())

    assert labels == []
    assert similarity == 0.9


async def test_judge_cpv_without_llm_returns_no_score(monkeypatch):
    monkeypatch.setattr(tenders, "complete_json", AsyncMock(return_value=None))

    labels, similarity = await tenders._judge_cpv(_tender(), AsyncMock())

    assert similarity is None
