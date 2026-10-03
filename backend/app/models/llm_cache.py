from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LLMCache(Base):
    """
    Cache for LLM-derived results keyed on (tender_ocds_id, prompt_version).
    Avoids re-running expensive extractions on the same tender at demo time.
    Bump prompt_version (e.g. "eligibility-v2") to invalidate a specific cache.
    """

    __tablename__ = "llm_cache"
    __table_args__ = (
        UniqueConstraint(
            "tender_ocds_id", "prompt_version", name="uq_llm_cache_tender_prompt"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    tender_ocds_id: Mapped[str] = mapped_column(String(128), index=True)
    prompt_version: Mapped[str] = mapped_column(String(64))
    result: Mapped[Any] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
