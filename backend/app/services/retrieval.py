"""Pick the most relevant document chunks for a tender.

Uses pgvector cosine distance when chunk embeddings exist, otherwise falls back
to the first chunks by page order. Lets the LLM see the pages that actually
matter instead of an arbitrary prefix.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.embedder import embed_texts
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.tender import Tender
from app.services.red_flags import ChunkRef


async def relevant_chunk_refs(
    db: AsyncSession,
    tender: Tender,
    documents: list[Document],
    limit: int = 12,
) -> list[ChunkRef]:
    docs_by_id = {d.id: d for d in documents}
    query_text = f"{tender.title or ''} {tender.description or ''}".strip()

    embeddings = await embed_texts([query_text], is_query=True) if query_text else []
    query_vec = embeddings[0] if embeddings else None

    if query_vec is not None:
        stmt = (
            select(Chunk)
            .where(
                Chunk.tender_id == tender.id,
                Chunk.text.isnot(None),
                Chunk.embedding.isnot(None),
            )
            .order_by(Chunk.embedding.cosine_distance(query_vec))
            .limit(limit)
        )
    else:
        stmt = (
            select(Chunk)
            .where(Chunk.tender_id == tender.id, Chunk.text.isnot(None))
            .order_by(Chunk.page_number)
            .limit(limit)
        )

    chunks = list((await db.execute(stmt)).scalars().all())

    refs: list[ChunkRef] = []
    for chunk in chunks:
        doc = docs_by_id.get(chunk.document_id)
        refs.append(
            ChunkRef(
                text=chunk.text or "",
                document_id=str(chunk.document_id),
                document_title=(
                    doc.title if doc and doc.title else f"Document {chunk.document_id}"
                ),
                page=chunk.page_number,
                url=doc.url if doc else None,
            )
        )
    return refs
