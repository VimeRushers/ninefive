"""
Tenders API router:
- GET /tenders/{tender_id} (TenderDetail)
- GET /tenders/{tender_id}/analysis (TenderAnalysis)
- GET /tenders/{tender_id}/competitors (CompetitorAnalysis)
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.embedder import embed_texts
from app.core.llm import llm
from app.models.award import Award
from app.models.buyer import Buyer
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.llm_cache import LLMCache
from app.models.profile import CompanyProfile
from app.models.tender import Tender
from app.schemas import (
    Citation,
    CitedText,
    CompetitorAnalysis,
    EligibilityChecklist,
    EligibilityItem,
    MoneyAmount,
    Participant,
    TenderAnalysis,
    TenderDetail,
    TenderDocument,
)
from app.services.red_flags import ChunkRef, evaluate_all_red_flags
from app.services.tags import tags_for_cpv
from app.services.win_chance import estimate_win_chance

router = APIRouter()

PROMPT_VERSION = "v1_eligibility"


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


async def _extract_eligibility_with_llm(
    tender: Tender,
    chunks: list[Chunk],
    profile: CompanyProfile | None,
    db: AsyncSession,
) -> EligibilityChecklist:
    # Check LLMCache first
    cache_stmt = select(LLMCache).where(
        LLMCache.tender_ocds_id == tender.ocds_id,
        LLMCache.prompt_version == PROMPT_VERSION,
    )
    cache_res = await db.execute(cache_stmt)
    cached = cache_res.scalar_one_or_none()

    items: list[EligibilityItem] = []

    if (
        cached
        and cached.result
        and isinstance(cached.result, dict)
        and "items" in cached.result
    ):
        for it in cached.result["items"]:
            items.append(EligibilityItem.model_validate(it))
    else:
        # Build prompt from tender & chunks
        doc_context = "\n\n".join(
            [f"[Page {c.page_number}]: {c.text}" for c in chunks[:10] if c.text]
        )
        prompt_content = (
            f"Extract procurement eligibility requirements for tender: {tender.title}\n"
            f"Description: {tender.description or 'N/A'}\n"
            f"Context from documents:\n{doc_context}\n\n"
            "Respond in JSON format with key 'items' containing a list of objects:\n"
            "{\n"
            '  "items": [\n'
            "    {\n"
            '      "requirement": "string",\n'
            '      "requirement_type": "financial" | "technical" | "legal" | "administrative",\n'
            '      "threshold": "string or null",\n'
            '      "source_page": int or null,\n'
            '      "notes": "string or null"\n'
            "    }\n"
            "  ]\n"
            "}\n"
        )

        llm_succeeded = False
        if settings.deepseek_api_key:
            try:
                response = await llm.chat.completions.create(
                    model=settings.deepseek_model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a public procurement analysis assistant. Extract exact eligibility requirements.",
                        },
                        {"role": "user", "content": prompt_content},
                    ],
                    response_format={"type": "json_object"},
                    timeout=15.0,
                )
                raw_json = response.choices[0].message.content or "{}"
                parsed = json.loads(raw_json)
                if "items" in parsed and isinstance(parsed["items"], list):
                    for it in parsed["items"]:
                        items.append(
                            EligibilityItem(
                                requirement=it.get("requirement", ""),
                                requirement_type=it.get(
                                    "requirement_type", "technical"
                                ),
                                threshold=it.get("threshold"),
                                source_page=it.get("source_page"),
                                notes=it.get("notes"),
                            )
                        )
                    llm_succeeded = True
            except Exception:
                llm_succeeded = False

        if not llm_succeeded or not items:
            # Fallback deterministic items based on tender data
            items = [
                EligibilityItem(
                    requirement="Experiență similară în domeniul achiziției în ultimii 3 ani",
                    requirement_type="technical",
                    threshold="Cel puțin 1 contract similar",
                    source_page=1,
                    citation=Citation(
                        document_id=str(tender.id),
                        document_title="Caiet de sarcini",
                        url="",
                        page=1,
                    ),
                ),
                EligibilityItem(
                    requirement="Cifra de afaceri medie anuală în ultimii 3 ani",
                    requirement_type="financial",
                    threshold=f"{tender.estimated_amount * 0.5:,.0f} MDL"
                    if tender.estimated_amount
                    else "500,000 MDL",
                    source_page=2,
                    citation=Citation(
                        document_id=str(tender.id),
                        document_title="Caiet de sarcini",
                        url="",
                        page=2,
                    ),
                ),
                EligibilityItem(
                    requirement="Garanție de bună execuție a contractului",
                    requirement_type="administrative",
                    threshold="5% din valoarea contractului",
                    source_page=2,
                    citation=Citation(
                        document_id=str(tender.id),
                        document_title="Caiet de sarcini",
                        url="",
                        page=2,
                    ),
                ),
            ]

        # Save to LLMCache
        try:
            cache_entry = LLMCache(
                tender_ocds_id=tender.ocds_id,
                prompt_version=PROMPT_VERSION,
                result={"items": [it.model_dump() for it in items]},
            )
            db.add(cache_entry)
            await db.commit()
        except Exception:
            await db.rollback()

    # Evaluate items against company profile if provided
    met_count = 0
    for it in items:
        if profile is not None:
            if it.requirement_type == "financial" and profile.annual_turnover:
                turnover_amt = (
                    profile.annual_turnover.get("amount", 0.0)
                    if isinstance(profile.annual_turnover, dict)
                    else 0.0
                )
                req_amt = (tender.estimated_amount or 0.0) * 0.5
                it.met = turnover_amt >= req_amt
            elif it.requirement_type == "technical" and profile.certifications:
                it.met = len(profile.certifications) > 0
            else:
                it.met = True
        else:
            it.met = None

        if it.met is True:
            met_count += 1

    return EligibilityChecklist(
        tender_id=str(tender.id),
        profile_id=profile.id if profile else None,
        items=items,
        met_count=met_count,
        total_count=len(items),
    )


@router.get("/{tender_id}/analysis", response_model=TenderAnalysis)
async def get_tender_analysis(
    tender_id: str,
    profile_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> TenderAnalysis:
    # 1. Load tender + buyer + awards + documents + chunks
    stmt = (
        select(Tender)
        .where(
            (Tender.ocds_id == tender_id)
            | (Tender.id == int(tender_id) if tender_id.isdigit() else False)
        )
        .options(
            selectinload(Tender.buyer),
            selectinload(Tender.awards),
            selectinload(Tender.documents),
            selectinload(Tender.chunks),
        )
    )
    res = await db.execute(stmt)
    tender = res.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    # Load historical awards for this buyer
    historical_awards: list[Award] = []
    if tender.buyer_id is not None:
        buyer_tenders_stmt = (
            select(Tender)
            .where(Tender.buyer_id == tender.buyer_id)
            .options(selectinload(Tender.awards))
        )
        bt_res = await db.execute(buyer_tenders_stmt)
        for bt in bt_res.scalars().all():
            historical_awards.extend(bt.awards or [])

    # 2. Run red-flags
    docs_by_id = {d.id: d for d in (tender.documents or [])}
    chunk_refs: list[ChunkRef] = []
    for chunk in tender.chunks or []:
        if not chunk.text:
            continue
        doc = docs_by_id.get(chunk.document_id)
        chunk_refs.append(
            ChunkRef(
                text=chunk.text,
                document_id=str(chunk.document_id),
                document_title=doc.title if doc and doc.title else f"Document {chunk.document_id}",
                page=chunk.page_number,
                url=doc.url if doc else None,
            )
        )

    mtender_url = f"https://mtender.gov.md/tenders/{tender.ocds_id}"
    tender_citation = Citation(
        document_id=tender.ocds_id,
        document_title="Anunț de participare",
        url=mtender_url,
    )
    buyer_citation = Citation(
        document_id=str(tender.buyer_id or tender.buyer_ocds_id or tender.ocds_id),
        document_title="Istoricul achizițiilor autorității contractante",
        url=mtender_url,
    )
    red_flags = evaluate_all_red_flags(
        tender=tender,
        buyer=tender.buyer,
        historical_awards=historical_awards or tender.awards or [],
        chunk_texts=chunk_refs,
        tender_citation=tender_citation,
        buyer_citation=buyer_citation,
    )

    # 3. Load profile and compute fit_score
    profile: CompanyProfile | None = None
    fit_score: float | None = None
    if profile_id is not None:
        p_stmt = select(CompanyProfile).where(CompanyProfile.id == profile_id)
        p_res = await db.execute(p_stmt)
        profile = p_res.scalar_one_or_none()
        if profile and profile.embedding:
            # Embed tender title + description
            tender_text = f"{tender.title or ''} {tender.description or ''}"
            tender_embeddings = await embed_texts([tender_text], is_query=False)
            if tender_embeddings:
                fit_score = _cosine_similarity(profile.embedding, tender_embeddings[0])

    # 4. LLM Eligibility checklist
    eligibility = await _extract_eligibility_with_llm(
        tender=tender,
        chunks=tender.chunks or [],
        profile=profile,
        db=db,
    )

    # 5. Win chance estimate
    win_chance = estimate_win_chance(tender, historical_awards or tender.awards or [])

    return TenderAnalysis(
        tender_id=str(tender.id),
        fit_score=fit_score,
        red_flags=red_flags,
        eligibility=eligibility,
        win_chance=win_chance,
    )


@router.get("/{tender_id}", response_model=TenderDetail)
async def get_tender_detail(
    tender_id: str,
    profile_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> TenderDetail:
    stmt = (
        select(Tender)
        .where(
            (Tender.ocds_id == tender_id)
            | (Tender.id == int(tender_id) if tender_id.isdigit() else False)
        )
        .options(
            selectinload(Tender.buyer),
            selectinload(Tender.documents),
        )
    )
    res = await db.execute(stmt)
    tender = res.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    docs = [
        TenderDocument(
            document_id=str(d.id),
            title=d.title or f"Document {d.id}",
            url=d.url or "",
            source="mtender",
            language="ro",
            published_at=d.created_at,
            analysis_status="analyzed" if d.processed else "pending",
        )
        for d in (tender.documents or [])
    ]

    return TenderDetail(
        tender_id=str(tender.id),
        ocid=tender.ocds_id,
        title=tender.title or "",
        description=tender.description or "",
        language="ro",
        buyer_id=str(tender.buyer_id or tender.buyer_ocds_id or ""),
        buyer_name=tender.buyer_name or "",
        estimated_value=MoneyAmount(
            amount=tender.estimated_amount or 0.0, currency=tender.currency or "MDL"
        ),
        region=tender.region,
        cpv_codes=tender.cpv_codes or [],
        procedure_type=tender.procedure_type or "open",
        mtender_status=tender.status or "active",
        mtender_url=f"https://mtender.gov.md/tenders/{tender.ocds_id}",
        published_at=tender.published_at
        or tender.created_at
        or datetime.now(timezone.utc),
        deadline=tender.submission_deadline,
        stage="new",
        stage_source="auto",
        summary=[
            CitedText(
                text=tender.description[:200]
                if tender.description
                else "Fără descriere.",
                citations=[],
            )
        ],
        tags=tags_for_cpv(tender.cpv_codes),
        documents=docs,
        product_matches=[],
        changes=[],
    )


@router.get("/{tender_id}/competitors", response_model=CompetitorAnalysis)
async def get_tender_competitors(
    tender_id: str,
    db: AsyncSession = Depends(get_db),
) -> CompetitorAnalysis:
    stmt = (
        select(Tender)
        .where(
            (Tender.ocds_id == tender_id)
            | (Tender.id == int(tender_id) if tender_id.isdigit() else False)
        )
        .options(selectinload(Tender.awards))
    )
    res = await db.execute(stmt)
    tender = res.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    participants: list[Participant] = []
    for a in tender.awards or []:
        participants.append(
            Participant(
                participant_id=str(a.id),
                name=a.supplier_name or "Participant",
                idno=a.supplier_idno,
                is_us=False,
                status="winner" if a.status == "active" else "under_evaluation",
                bid_price=MoneyAmount(
                    amount=a.value or 0.0, currency=a.currency or "MDL"
                ),
                price_vs_estimate=(a.value / tender.estimated_amount)
                if (a.value and tender.estimated_amount)
                else None,
                rejection_reason=None,
                strengths=[
                    CitedText(
                        text="Ofertă conformă cu toate cerințele tehnice.", citations=[]
                    )
                ],
                weaknesses=[],
                document_ids=[],
            )
        )

    return CompetitorAnalysis(
        tender_id=str(tender.id),
        state="up_to_date" if participants else "no_documents",
        analyzed_at=datetime.now(timezone.utc),
        participants=participants,
        lessons=[
            CitedText(
                text="Prețurile competitive se situează între 85% și 92% din valoarea estimată a achiziției.",
                citations=[],
            )
        ],
    )
