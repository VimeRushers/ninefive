from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class BidStatistic(Base):
    """
    Aggregate bid statistics from the OCDS bids extension (bids.statistics[]).
    Individual bidder identities are sealed until after award — only counts
    are available pre-award, which is correct by design.

    Common measure values: "requests", "bids", "validBids", "disqualifiedBids",
    "unsuccessfulBids", "electronicBids".
    """

    __tablename__ = "bid_statistics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tender_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenders.id"), index=True
    )
    measure: Mapped[str] = mapped_column(String(64))
    value: Mapped[float] = mapped_column(Float)
    # Lot ID if the statistic applies to a specific lot; NULL = whole tender
    related_lot: Mapped[str | None] = mapped_column(String(128))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    tender: Mapped["Tender"] = relationship("Tender", back_populates="bid_statistics")  # type: ignore[name-defined]
