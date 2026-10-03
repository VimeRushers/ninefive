"""Shared DeepSeek JSON-completion helper.

Every LLM feature goes through here so caching, the single retry, the timeout
and graceful fallback behave the same everywhere. Cache key is
(tender_ocds_id, prompt_version): bump the version string to invalidate.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Callable
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.llm import llm
from app.models.llm_cache import LLMCache

logger = logging.getLogger(__name__)


async def get_cached(
    db: AsyncSession, tender_ocds_id: str, prompt_version: str
) -> dict | None:
    result = await db.execute(
        select(LLMCache).where(
            LLMCache.tender_ocds_id == tender_ocds_id,
            LLMCache.prompt_version == prompt_version,
        )
    )
    cached = result.scalar_one_or_none()
    if cached is not None and isinstance(cached.result, dict):
        return cached.result
    return None


async def complete_json(
    db: AsyncSession,
    tender_ocds_id: str,
    prompt_version: str,
    system: str,
    user: str,
    validator: Callable[[dict], bool] | None = None,
) -> dict | None:
    """Return cached JSON, or call DeepSeek once (retrying once), or None."""
    cached = await get_cached(db, tender_ocds_id, prompt_version)
    if cached is not None:
        return cached

    if not settings.deepseek_api_key:
        return None

    for attempt in range(2):
        try:
            response = await llm.chat.completions.create(
                model=settings.deepseek_model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                response_format={"type": "json_object"},
                reasoning_effort=settings.deepseek_reasoning_effort,
                timeout=settings.deepseek_timeout_seconds,
            )
            raw = response.choices[0].message.content or "{}"
            parsed: Any = json.loads(raw)
            if not isinstance(parsed, dict):
                raise ValueError("response is not a JSON object")
            if validator is not None and not validator(parsed):
                raise ValueError("response failed validation")
            await _store(db, tender_ocds_id, prompt_version, parsed)
            return parsed
        except Exception as exc:
            logger.warning(
                "DeepSeek call failed (tender=%s version=%s attempt=%d): %s",
                tender_ocds_id,
                prompt_version,
                attempt + 1,
                exc,
            )

    return None


async def _store(
    db: AsyncSession,
    tender_ocds_id: str,
    prompt_version: str,
    result: dict,
) -> None:
    try:
        db.add(
            LLMCache(
                tender_ocds_id=tender_ocds_id,
                prompt_version=prompt_version,
                result=result,
            )
        )
        await db.commit()
    except Exception:
        await db.rollback()
