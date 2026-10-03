from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ocds_id: Mapped[str] = mapped_column(String(128), index=True)
    tender_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenders.id"), index=True
    )
    # Set for bid/offer documents; null for tender-level documents
    participant_ocds_id: Mapped[str | None] = mapped_column(String(128), index=True)

    url: Mapped[str] = mapped_column(Text)
    title: Mapped[str | None] = mapped_column(Text)
    # OCDS documentType, e.g. "tenderNotice", "biddingDocuments", "technicalSpecifications"
    document_type: Mapped[str | None] = mapped_column(String(64))
    language: Mapped[str | None] = mapped_column(String(8))
    # Absolute local path set after the file is downloaded
    local_path: Mapped[str | None] = mapped_column(Text)
    # True once text has been extracted and chunks written
    processed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    tender: Mapped["Tender"] = relationship("Tender", back_populates="documents")  # type: ignore[name-defined]
    chunks: Mapped[list["Chunk"]] = relationship("Chunk", back_populates="document")  # type: ignore[name-defined]
