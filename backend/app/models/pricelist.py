from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Pricelist(Base):
    __tablename__ = "pricelists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("company_profiles.id"), index=True
    )
    file_name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(16), default="processing")
    item_count: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    profile: Mapped["CompanyProfile"] = relationship(  # type: ignore[name-defined]
        "CompanyProfile", back_populates="pricelists"
    )
    items: Mapped[list["CatalogueItem"]] = relationship(  # type: ignore[name-defined]
        "CatalogueItem",
        back_populates="pricelist",
        cascade="all, delete-orphan",
    )
