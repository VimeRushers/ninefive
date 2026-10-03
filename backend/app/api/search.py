"""
Search API router — semantic vector search over tenders.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.embedder import embed_texts
from app.models.chunk import Chunk
from app.models.profile import CompanyProfile
from app.models.tender import Tender
from app.schemas import MoneyAmount, SearchResponse, SearchResult

router = APIRouter()


def _fit_score(distance: float, cpv_boost: bool) -> float:
    similarity = max(0.0, min(1.0, 1.0 - float(distance)))
    if cpv_boost:
        similarity = min(1.0, similarity + 0.2)
    return round(max(0.05, similarity), 2)


@router.get("", response_model=SearchResponse)
async def search_tenders(
    q: str = Query(..., description="Search query — Romanian, Russian, or English"),
    profile_id: int | None = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
) -> SearchResponse:
    query_embeddings = await embed_texts([q], is_query=True)
    query_vec = query_embeddings[0] if query_embeddings else None
    if query_vec is None:
        return SearchResponse(query=q, profile_id=profile_id, results=[], total=0)

    profile_cpvs: set[str] = set()
    if profile_id:
        profile = (
            await db.execute(
                select(CompanyProfile).where(CompanyProfile.id == profile_id)
            )
        ).scalar_one_or_none()
        if profile and profile.cpv_codes:
            profile_cpvs = set(profile.cpv_codes)

    distance = Tender.embedding.cosine_distance(query_vec)

    total = (
        await db.execute(
            select(func.count()).select_from(Tender).where(Tender.embedding.isnot(None))
        )
    ).scalar_one()

    rows = (
        await db.execute(
            select(Tender, distance.label("distance"))
            .where(Tender.embedding.isnot(None))
            .order_by(distance)
            .limit(limit)
            .offset(offset)
        )
    ).all()

    tender_ids = [tender.id for tender, _dist in rows]
    snippets: dict[int, str] = {}
    if tender_ids:
        chunk_distance = Chunk.embedding.cosine_distance(query_vec)
        chunk_rows = (
            await db.execute(
                select(Chunk.tender_id, Chunk.text, chunk_distance.label("distance"))
                .where(
                    Chunk.tender_id.in_(tender_ids),
                    Chunk.embedding.isnot(None),
                )
                .order_by(Chunk.tender_id, chunk_distance)
            )
        ).all()
        for tender_id, text, _dist in chunk_rows:
            snippets.setdefault(tender_id, text)

    results: list[SearchResult] = []
    for tender, dist in rows:
        boost = bool(
            profile_cpvs
            and tender.cpv_codes
            and profile_cpvs.intersection(tender.cpv_codes)
        )
        snippet = (
            snippets.get(tender.id)
            or (tender.description or "")[:250]
            or tender.title
            or "Potrivire pe baza specificațiilor achiziției."
        )
        results.append(
            SearchResult(
                tender_id=str(tender.id),
                title=tender.title or "Achiziție publică",
                buyer_name=tender.buyer_name or "Autoritate contractantă",
                estimated_value=MoneyAmount(
                    amount=tender.estimated_amount or 0.0,
                    currency=tender.currency or "MDL",
                ),
                deadline=tender.submission_deadline,
                fit_score=_fit_score(dist, boost),
                match_snippet=snippet[:300],
                red_flag_count=0,
            )
        )

    return SearchResponse(
        query=q,
        profile_id=profile_id,
        results=results,
        total=int(total or 0),
    )
