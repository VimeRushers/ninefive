"""
Warm embeddings and DeepSeek caches for the demo tenders.
Usage (from backend/):
    python -m scripts.precompute
Speeds up the first visit to each tender during the demo.
"""

from __future__ import annotations

import asyncio

import app.models  # noqa: F401
from app.api.tenders import (
    get_tender_analysis,
    get_tender_competitors,
    get_tender_detail,
)
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.profile import CompanyProfile
from app.models.tender import Tender
from sqlalchemy import select
from scripts.embed_chunks import (
    embed_all_unembedded_chunks,
    embed_all_unembedded_tenders,
)


async def precompute() -> None:
    await embed_all_unembedded_chunks()
    await embed_all_unembedded_tenders()

    if not settings.deepseek_api_key:
        print("DEEPSEEK_API_KEY not set: skipping LLM cache warm-up.")
        return

    async with AsyncSessionLocal() as session:
        profile = (
            await session.execute(select(CompanyProfile).limit(1))
        ).scalar_one_or_none()
        profile_id = profile.id if profile else None
        tenders = (await session.execute(select(Tender))).scalars().all()

        for tender in tenders:
            try:
                await get_tender_detail(str(tender.id), profile_id, session)
                await get_tender_analysis(str(tender.id), profile_id, session)
                await get_tender_competitors(str(tender.id), session)
                print(f"Precomputed tender {tender.id} ({tender.ocds_id})")
            except Exception as exc:
                print(f"Skipped tender {tender.id}: {exc}")


if __name__ == "__main__":
    asyncio.run(precompute())
