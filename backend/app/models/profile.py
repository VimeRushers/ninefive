from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

EMBEDDING_DIM = 1024  # multilingual-e5-large


class CompanyProfile(Base):
    __tablename__ = "company_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    idno: Mapped[str | None] = mapped_column(String(13), index=True)
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    cpv_codes: Mapped[Any] = mapped_column(JSONB, nullable=True)  # list[str]
    regions: Mapped[Any] = mapped_column(JSONB, nullable=True)  # list[str]
    budget_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    budget_max: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Extended profile attributes for eligibility matching
    annual_turnover: Mapped[Any] = mapped_column(
        JSONB, nullable=True
    )  # {amount, currency}
    employee_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    licenses: Mapped[Any] = mapped_column(JSONB, nullable=True)  # list[str]
    certifications: Mapped[Any] = mapped_column(JSONB, nullable=True)  # list[str]

    # Populated after embedding the description field
    embedding: Mapped[Any] = mapped_column(Vector(EMBEDDING_DIM), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
