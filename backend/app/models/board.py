from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BoardEntry(Base):
    """
    Per-profile kanban stage for a tender. Stage belongs to the profile, not the
    tender itself, so it lives here instead of on the tenders table.
    """

    __tablename__ = "board_entries"
    __table_args__ = (
        UniqueConstraint(
            "profile_id", "tender_id", name="uq_board_entry_profile_tender"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("company_profiles.id"), index=True
    )
    tender_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenders.id"), index=True
    )
    stage: Mapped[str] = mapped_column(String(32), default="new")
    stage_source: Mapped[str] = mapped_column(String(8), default="auto")
    stage_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
