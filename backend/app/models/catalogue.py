from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CatalogueItem(Base):
    __tablename__ = "catalogue_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pricelist_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pricelists.id"), index=True
    )
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[Any] = mapped_column(JSONB, nullable=True)  # {amount, currency}

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    pricelist: Mapped["Pricelist"] = relationship(  # type: ignore[name-defined]
        "Pricelist", back_populates="items"
    )
