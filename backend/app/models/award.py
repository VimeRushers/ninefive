from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Award(Base):
    __tablename__ = "awards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ocds_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    tender_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenders.id"), index=True
    )

    supplier_name: Mapped[str | None] = mapped_column(Text)
    # IDNO = Moldovan company tax ID (13 digits). May be absent in older records.
    supplier_idno: Mapped[str | None] = mapped_column(String(13), index=True)
    supplier_ocds_id: Mapped[str | None] = mapped_column(String(128), index=True)

    value: Mapped[float | None] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(8), default="MDL")
    date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str | None] = mapped_column(String(32))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    tender: Mapped["Tender"] = relationship("Tender", back_populates="awards")  # type: ignore[name-defined]
