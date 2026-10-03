from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

EMBEDDING_DIM = 1024  # multilingual-e5-large


class Chunk(Base):
    """
    One text chunk extracted from a tender document.
    Each chunk gets a pgvector embedding used for semantic search.
    tender_id is denormalized here to avoid a join in the hot search path.
    """

    __tablename__ = "chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("documents.id"), index=True
    )
    # Denormalized so search queries can filter by tender without joining documents
    tender_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenders.id"), index=True
    )

    page_number: Mapped[int | None] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    # NULL until the embedder runs
    embedding: Mapped[Any] = mapped_column(Vector(EMBEDDING_DIM), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    document: Mapped["Document"] = relationship("Document", back_populates="chunks")  # type: ignore[name-defined]
    tender: Mapped["Tender"] = relationship("Tender", back_populates="chunks")  # type: ignore[name-defined]
