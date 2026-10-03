"""
Tender Board API — Kanban board supporting stages and filtering.
"""

from __future__ import annotations

import math
import unicodedata
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.embedder import embed_texts
from app.models.award import Award
from app.models.board import BoardEntry
from app.models.profile import CompanyProfile
from app.models.tender import Tender
from app.models.tender_change import TenderChange
from app.schemas import (
    BoardCard,
    BoardResponse,
    MoneyAmount,
    Stage,
    StageUpdate,
)
from app.services.eligibility import board_eligibility
from app.services.red_flags import evaluate_all_red_flags
from app.services.tags import tags_for_cpv
from app.services.win_chance import estimate_win_chance

router = APIRouter()


def _normalize(text: str) -> str:
    """Lowercase and strip diacritics so "achizitionarea" matches "Achiziționarea"."""
    decomposed = unicodedata.normalize("NFD", text)
    return "".join(c for c in decomposed if not unicodedata.combining(c)).lower()


def _in_date_range(value: datetime | None, start: date | None, end: date | None) -> bool:
    if start is None and end is None:
        return True
    if value is None:
        return False
    day = value.date()
    return (start is None or day >= start) and (end is None or day <= end)


def _in_share(value: float | None, low: float | None, high: float | None) -> bool:
    if low is None and high is None:
        return True
    if value is None:
        return False
    return (low is None or value >= low) and (high is None or value <= high)


def _eligibility_share(card: BoardCard) -> float | None:
    summary = card.eligibility
    if summary is None:
        return None
    checkable = summary.total_count - summary.unknown_count
    if checkable <= 0:
        return None
    return summary.met_count / checkable


def _vector(value: object) -> list[float]:
    if value is None:
        return []
    try:
        return [float(x) for x in value]  # type: ignore[union-attr]
    except TypeError:
        return []


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def _to_card(
    tender: Tender,
    entry: BoardEntry | None,
    historical_awards: list[Award],
    profile: CompanyProfile | None = None,
    changed_in_last_sync: bool = False,
) -> BoardCard:
    amt = tender.estimated_amount or 0.0
    red_flags = evaluate_all_red_flags(
        tender=tender,
        buyer=None,
        historical_awards=historical_awards,
        chunk_texts=[],
    )
    win_chance = estimate_win_chance(tender, historical_awards)
    eligibility_summary, questionable_reasons = board_eligibility(tender, profile)

    return BoardCard(
        tender_id=str(tender.id),
        title=tender.title or "Achiziție publică",
        mtender_url=f"https://mtender.gov.md/tenders/{tender.ocds_id}",
        buyer_id=str(tender.buyer_id or tender.buyer_ocds_id or ""),
        buyer_name=tender.buyer_name or "Autoritate contractantă",
        estimated_value=MoneyAmount(amount=amt, currency=tender.currency or "MDL"),
        region=tender.region,
        published_at=tender.published_at
        or tender.created_at
        or datetime.now(timezone.utc),
        modified_at=tender.updated_at,
        tender_start_at=tender.published_at,
        deadline=tender.submission_deadline,
        stage=entry.stage if entry else "new",
        stage_source=entry.stage_source if entry else "auto",
        stage_reason=entry.stage_reason if entry else None,
        questionable_reasons=questionable_reasons,
        eligibility=eligibility_summary,
        win_probability=win_chance.estimated_probability,
        tags=tags_for_cpv(tender.cpv_codes),
        red_flag_count=sum(1 for flag in red_flags if flag.triggered),
        changed_in_last_sync=changed_in_last_sync,
    )


async def _semantic_board(
    tenders: list[Tender],
    q: str,
    entries: dict[int, BoardEntry],
    awards_by_buyer: dict[int, list[Award]],
    profile: CompanyProfile | None,
    changed_ids: set[int],
) -> list[BoardCard]:
    """Fallback search by meaning when no card matched the lexical query."""
    if not any(t.embedding is not None for t in tenders):
        return []

    embeddings = await embed_texts([q], is_query=True)
    query_vec = _vector(embeddings[0]) if embeddings else []
    if not query_vec:
        return []

    scored: list[tuple[float, Tender]] = []
    for tender in tenders:
        similarity = _cosine(query_vec, _vector(tender.embedding))
        if similarity >= 0.35:
            scored.append((similarity, tender))

    scored.sort(key=lambda item: item[0], reverse=True)

    cards: list[BoardCard] = []
    for _similarity, tender in scored:
        historical = awards_by_buyer.get(tender.buyer_id, []) if tender.buyer_id else []
        cards.append(
            _to_card(
                tender,
                entries.get(tender.id),
                historical,
                profile=profile,
                changed_in_last_sync=tender.id in changed_ids,
            )
        )
    return cards


@router.get("", response_model=BoardResponse)
async def get_board(
    profile_id: int = Query(1),
    q: str | None = Query(None),
    stages: list[Stage] = Query(default_factory=list),
    price_min: float | None = Query(None),
    price_max: float | None = Query(None),
    region: str | None = Query(None),
    published_from: date | None = Query(None),
    published_to: date | None = Query(None),
    modified_from: date | None = Query(None),
    modified_to: date | None = Query(None),
    start_from: date | None = Query(None),
    start_to: date | None = Query(None),
    tags: list[str] = Query(default_factory=list),
    win_min: float | None = Query(None, ge=0, le=1),
    win_max: float | None = Query(None, ge=0, le=1),
    eligibility_min: float | None = Query(None, ge=0, le=1),
    eligibility_max: float | None = Query(None, ge=0, le=1),
    db: AsyncSession = Depends(get_db),
) -> BoardResponse:
    # 1. Fetch profile if exists
    p_stmt = select(CompanyProfile).where(CompanyProfile.id == profile_id)
    p_res = await db.execute(p_stmt)
    profile = p_res.scalar_one_or_none()

    # 2. Fetch tenders with awards and documents
    stmt = (
        select(Tender)
        .options(selectinload(Tender.awards), selectinload(Tender.documents))
        .order_by(Tender.published_at.desc().nullslast())
    )
    res = await db.execute(stmt)
    tenders = list(res.scalars().all())

    # 3. Persisted stages for this profile (absent entry = default "new"/"auto")
    entries_res = await db.execute(
        select(BoardEntry).where(BoardEntry.profile_id == profile_id)
    )
    entries = {e.tender_id: e for e in entries_res.scalars().all()}

    # 4. Awards grouped by buyer, for win chance and integrity signals
    awards_by_buyer: dict[int, list[Award]] = {}
    for t in tenders:
        if t.buyer_id is not None:
            awards_by_buyer.setdefault(t.buyer_id, []).extend(t.awards or [])

    # 5. Tenders with a recorded change since the last sync
    changes_res = await db.execute(select(TenderChange.tender_id))
    changed_ids = set(changes_res.scalars().all())

    cards: list[BoardCard] = []

    for t in tenders:
        historical = awards_by_buyer.get(t.buyer_id, []) if t.buyer_id else []
        card = _to_card(
            t,
            entries.get(t.id),
            historical,
            profile=profile,
            changed_in_last_sync=t.id in changed_ids,
        )

        if price_min is not None or price_max is not None:
            amount = t.estimated_amount
            if amount is None:
                continue
            if price_min is not None and amount < price_min:
                continue
            if price_max is not None and amount > price_max:
                continue

        if region is not None and t.region != region:
            continue

        if q:
            words = _normalize(q).split()
            haystack = _normalize(
                " ".join(
                    [
                        t.title or "",
                        t.description or "",
                        t.buyer_name or "",
                        t.region or "",
                        *card.tags,
                    ]
                )
            )
            if not all(word in haystack for word in words):
                continue

        if not _in_date_range(t.published_at, published_from, published_to):
            continue
        if not _in_date_range(t.updated_at, modified_from, modified_to):
            continue
        if not _in_date_range(t.published_at, start_from, start_to):
            continue

        if tags and not all(tag in card.tags for tag in tags):
            continue

        if stages and card.stage not in stages:
            continue

        if not _in_share(card.win_probability, win_min, win_max):
            continue
        if not _in_share(_eligibility_share(card), eligibility_min, eligibility_max):
            continue

        cards.append(card)

    if q and not cards:
        cards = await _semantic_board(
            tenders, q, entries, awards_by_buyer, profile, changed_ids
        )

    return BoardResponse(
        profile_id=profile_id,
        cards=cards,
        last_sync_at=datetime.now(timezone.utc),
    )


@router.patch("/{tender_id}", response_model=BoardCard)
async def move_card(
    tender_id: str,
    payload: StageUpdate,
    profile_id: int = Query(1),
    db: AsyncSession = Depends(get_db),
) -> BoardCard:
    stmt = select(Tender).where(
        (Tender.ocds_id == tender_id)
        | (Tender.id == int(tender_id) if tender_id.isdigit() else False)
    )
    res = await db.execute(stmt)
    tender = res.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    entry_res = await db.execute(
        select(BoardEntry).where(
            BoardEntry.profile_id == profile_id, BoardEntry.tender_id == tender.id
        )
    )
    entry = entry_res.scalar_one_or_none()
    if entry is None:
        entry = BoardEntry(profile_id=profile_id, tender_id=tender.id)
        db.add(entry)

    entry.stage = payload.stage
    entry.stage_source = "manual"
    entry.stage_reason = None
    await db.commit()
    await db.refresh(entry)

    historical: list[Award] = []
    if tender.buyer_id is not None:
        hist_res = await db.execute(
            select(Award)
            .join(Tender, Award.tender_id == Tender.id)
            .where(Tender.buyer_id == tender.buyer_id)
        )
        historical = list(hist_res.scalars().all())

    return _to_card(tender, entry, historical)
