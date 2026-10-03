from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TenderChange(Base):
    __tablename__ = "tender_changes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tender_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenders.id"), index=True
    )
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    changes: Mapped[Any] = mapped_column(JSONB)  # list[str]
    verdict: Mapped[str] = mapped_column(String(16), default="still_relevant")
    reason: Mapped[Any] = mapped_column(JSONB, nullable=True)  # CitedText dict
    stage_before: Mapped[str | None] = mapped_column(String(32))
    stage_after: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
