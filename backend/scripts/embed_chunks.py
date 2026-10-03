"""
Batch-embed Chunk rows where embedding is NULL.
Usage (from backend/):
    python -m scripts.embed_chunks
"""

from __future__ import annotations

import asyncio

import app.models  # noqa: F401
from app.core.database import AsyncSessionLocal
from app.core.embedder import embed_texts
from app.models.chunk import Chunk
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


if __name__ == "__main__":
    asyncio.run(embed_all_unembedded_chunks())
