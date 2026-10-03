from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Tender(Base):
    __tablename__ = "tenders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ocds_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    title: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)

    # Buyer — FK to buyers table; buyer_name duplicated for fast display queries
    buyer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("buyers.id"), index=True
    )
    buyer_ocds_id: Mapped[str | None] = mapped_column(String(128), index=True)
    buyer_name: Mapped[str | None] = mapped_column(Text)

    # Value
    estimated_amount: Mapped[float | None] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(8), default="MDL")

    # Dates
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    submission_deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    # Classification
    cpv_codes: Mapped[Any] = mapped_column(JSONB, nullable=True)  # list[str]
    region: Mapped[str | None] = mapped_column(String(128))
    procedure_type: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str | None] = mapped_column(String(32))

    # Raw OCDS data kept for re-processing without re-fetching
    raw_ocds: Mapped[Any] = mapped_column(JSONB, nullable=True)
    # List of release-package URIs that must be fanned-out to get awards/items/parties
    ocds_packages: Mapped[Any] = mapped_column(JSONB, nullable=True)  # list[str]

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    buyer: Mapped["Buyer"] = relationship("Buyer", back_populates="tenders")  # type: ignore[name-defined]
    awards: Mapped[list["Award"]] = relationship("Award", back_populates="tender")  # type: ignore[name-defined]
    bid_statistics: Mapped[list["BidStatistic"]] = relationship(
        "BidStatistic", back_populates="tender"
    )  # type: ignore[name-defined]
    documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="tender"
    )  # type: ignore[name-defined]
    chunks: Mapped[list["Chunk"]] = relationship("Chunk", back_populates="tender")  # type: ignore[name-defined]
