"""
Batch-embed Chunk and Tender rows where embedding is NULL.
Usage (from backend/):
    python -m scripts.embed_chunks
"""

from __future__ import annotations

import asyncio

import app.models  # noqa: F401
from app.core.database import AsyncSessionLocal
from app.core.embedder import embed_texts
from app.models.chunk import Chunk
from app.models.profile import CompanyProfile
from app.models.tender import Tender
from sqlalchemy import select

BATCH_SIZE = 32


async def embed_all_unembedded_chunks() -> None:
    async with AsyncSessionLocal() as session:
        stmt = select(Chunk).where(Chunk.embedding.is_(None))
        res = await session.execute(stmt)
        chunks = list(res.scalars().all())

        print(f"Found {len(chunks)} chunks with missing embeddings.")
        if not chunks:
            return

        for i in range(0, len(chunks), BATCH_SIZE):
            batch = chunks[i : i + BATCH_SIZE]
            texts = [c.text for c in batch]
            print(
                f"Embedding batch {i // BATCH_SIZE + 1}/{(len(chunks) + BATCH_SIZE - 1) // BATCH_SIZE} ({len(batch)} chunks)..."
            )
            vectors = await embed_texts(texts, is_query=False)
            for chunk, vec in zip(batch, vectors):
                chunk.embedding = vec

            await session.commit()

        print("Done embedding all chunks.")


async def embed_all_unembedded_tenders() -> None:
    async with AsyncSessionLocal() as session:
        stmt = select(Tender).where(Tender.embedding.is_(None))
        res = await session.execute(stmt)
        tenders = list(res.scalars().all())

        print(f"Found {len(tenders)} tenders with missing embeddings.")
        if not tenders:
            return

        for i in range(0, len(tenders), BATCH_SIZE):
            batch = tenders[i : i + BATCH_SIZE]
            texts = [f"{t.title or ''} {t.description or ''}".strip() for t in batch]
            vectors = await embed_texts(texts, is_query=False)
            for tender, vec in zip(batch, vectors):
                tender.embedding = vec

            await session.commit()

        print("Done embedding all tenders.")


async def embed_all_unembedded_profiles() -> None:
    async with AsyncSessionLocal() as session:
        stmt = select(CompanyProfile).where(CompanyProfile.embedding.is_(None))
        profiles = list((await session.execute(stmt)).scalars().all())
        print(f"Found {len(profiles)} profiles with missing embeddings.")

        for profile in profiles:
            vector = (await embed_texts(
                [f"{profile.name}. {profile.description}"], is_query=False
            ))[0]
            profile.embedding = vector

        await session.commit()
        print("Done embedding profiles.")


async def main() -> None:
    await embed_all_unembedded_chunks()
    await embed_all_unembedded_tenders()
    await embed_all_unembedded_profiles()


if __name__ == "__main__":
    asyncio.run(main())
