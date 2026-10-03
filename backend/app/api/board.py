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

        card_stage: Stage = "new"
        if stages and card_stage not in stages:
            continue

        cards.append(
            BoardCard(
                tender_id=str(t.id),
                title=t.title or "Achiziție publică",
                mtender_url=f"https://mtender.gov.md/tenders/{t.ocds_id}",
                buyer_id=str(t.buyer_id or t.buyer_ocds_id or ""),
                buyer_name=t.buyer_name or "Autoritate contractantă",
                estimated_value=MoneyAmount(amount=amt, currency=t.currency or "MDL"),
                region=t.region,
                published_at=t.published_at
                or t.created_at
                or datetime.now(timezone.utc),
                modified_at=t.updated_at,
                tender_start_at=t.published_at,
                deadline=t.submission_deadline,
                stage=card_stage,
                stage_source="auto",
                stage_reason=None,
                questionable_reasons=[],
                eligibility=EligibilitySummary(
                    met_count=3, total_count=3, unknown_count=0
                ),
                win_probability=0.45,
                tags=["IT", "Hardware"] if "30" in str(t.cpv_codes) else ["Achiziții"],
                red_flag_count=0,
                changed_in_last_sync=False,
            )
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
        stage=payload.stage,
        stage_source="manual",
        stage_reason=None,
        questionable_reasons=[],
        eligibility=EligibilitySummary(met_count=3, total_count=3, unknown_count=0),
        win_probability=0.45,
        tags=["IT", "Hardware"] if "30" in str(tender.cpv_codes) else ["Achiziții"],
        red_flag_count=0,
        changed_in_last_sync=False,
    )
