"""
Search API router — Semantic and vector search over tenders and document chunks.
"""

from __future__ import annotations

import math
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.embedder import embed_texts
from app.models.chunk import Chunk
from app.models.profile import CompanyProfile
from app.models.tender import Tender
from app.schemas import MoneyAmount, SearchResponse, SearchResult

router = APIRouter()


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


@router.get("", response_model=SearchResponse)
async def search_tenders(
    q: str = Query(..., description="Search query — Romanian, Russian, or English"),
    profile_id: int | None = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
) -> SearchResponse:
    # 1. Embed query
    query_embeddings = await embed_texts([q], is_query=True)
    query_vec = query_embeddings[0] if query_embeddings else None

    # 2. Fetch profile embedding if profile_id provided
    profile_vec = None
    profile_cpvs: set[str] = set()
    if profile_id:
        p_stmt = select(CompanyProfile).where(CompanyProfile.id == profile_id)
        p_res = await db.execute(p_stmt)
        prof = p_res.scalar_one_or_none()
        if prof:
            profile_vec = prof.embedding
            if prof.cpv_codes:
                profile_cpvs = set(prof.cpv_codes)

    # 3. Load all tenders and their chunks
    stmt = (
        select(Tender)
        .options(selectinload(Tender.chunks), selectinload(Tender.documents))
        .order_by(Tender.published_at.desc().nullslast())
    )
    res = await db.execute(stmt)
    all_tenders = list(res.scalars().all())

    scored_results: list[SearchResult] = []

    for tender in all_tenders:
        best_chunk_score = 0.0
        best_chunk_text = ""

        # Score chunks if available
        if tender.chunks and query_vec:
            for chunk in tender.chunks:
                if chunk.embedding is not None:
                    # In pgvector / python memory
                    c_vec = (
                        list(chunk.embedding)
                        if hasattr(chunk.embedding, "__iter__")
                        else []
                    )
                    sim = _cosine_similarity(query_vec, c_vec)
                    if sim > best_chunk_score:
                        best_chunk_score = sim
                        best_chunk_text = chunk.text

        # Fallback text scoring if no chunks or lexical match
        tender_title = tender.title or ""
        tender_desc = tender.description or ""
        combined_text = f"{tender_title} {tender_desc}".lower()

        # Word overlap bonus
        q_words = [w.lower() for w in q.split() if len(w) > 2]
        match_count = sum(1 for w in q_words if w in combined_text)
        lexical_score = (match_count / max(1, len(q_words))) if q_words else 0.0

        base_sim = max(best_chunk_score, lexical_score)

        # Profile CPV overlap boost
        profile_boost = 0.0
        if profile_cpvs and tender.cpv_codes:
            overlap = set(tender.cpv_codes).intersection(profile_cpvs)
            if overlap:
                profile_boost = 0.2

        fit_score = max(
            0.05,
            min(
                1.0,
                0.7 * base_sim + 0.3 * profile_boost
                if (base_sim > 0 or profile_boost > 0)
                else 0.1,
            ),
        )

        # Build match snippet
        if not best_chunk_text:
            best_chunk_text = (
                tender_desc[:250]
                if tender_desc
                else (tender_title or "Potrivire pe baza specificațiilor achiziției.")
            )

        scored_results.append(
            SearchResult(
                tender_id=str(tender.id),
                title=tender.title or "Achiziție publică",
                buyer_name=tender.buyer_name or "Autoritate contractantă",
                estimated_value=MoneyAmount(
                    amount=tender.estimated_amount or 0.0,
                    currency=tender.currency or "MDL",
                ),
                deadline=tender.submission_deadline,
                fit_score=round(fit_score, 2),
                match_snippet=best_chunk_text[:300],
                red_flag_count=0,
            )
        )

    # Sort by fit_score descending
    scored_results.sort(key=lambda x: x.fit_score, reverse=True)
    paged_results = scored_results[offset : offset + limit]

    return SearchResponse(
        query=q,
        profile_id=profile_id,
        results=paged_results,
        total=len(scored_results),
    )
