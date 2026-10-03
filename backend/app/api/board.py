"""
Tender Board API — Kanban board supporting stages and filtering.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.award import Award
from app.models.board import BoardEntry
from app.models.profile import CompanyProfile
from app.models.tender import Tender
from app.schemas import (
    BoardCard,
    BoardResponse,
    EligibilitySummary,
    MoneyAmount,
    Stage,
    StageUpdate,
)

router = APIRouter()


def _to_card(tender: Tender, entry: BoardEntry | None) -> BoardCard:
    amt = tender.estimated_amount or 0.0
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
        questionable_reasons=[],
        eligibility=EligibilitySummary(met_count=3, total_count=3, unknown_count=0),
        win_probability=0.45,
        tags=["IT", "Hardware"] if "30" in str(tender.cpv_codes) else ["Achiziții"],
        red_flag_count=0,
        changed_in_last_sync=False,
    )


@router.get("", response_model=BoardResponse)
async def get_board(
    profile_id: int = Query(1),
    q: str | None = Query(None),
    stages: list[Stage] = Query(default_factory=list),
    price_min: float | None = Query(None),
    price_max: float | None = Query(None),
    region: str | None = Query(None),
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

    cards: list[BoardCard] = []

    for t in tenders:
        # Filter price
        amt = t.estimated_amount or 0.0
        if price_min is not None and amt < price_min:
            continue
        if price_max is not None and amt > price_max:
            continue
        if region is not None and t.region != region:
            continue

        # Filter q (case-insensitive substring)
        if q:
            q_lower = q.lower()
            haystack = f"{t.title or ''} {t.description or ''} {t.buyer_name or ''} {t.region or ''}".lower()
            if not all(word in haystack for word in q_lower.split()):
                continue

        card = _to_card(t, entries.get(t.id))
        if stages and card.stage not in stages:
            continue
        cards.append(card)

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

    return _to_card(tender, entry)
