import json
from unittest.mock import AsyncMock, MagicMock

import pytest
from app.core.config import settings
from app.services import llm_analysis


def _session(cached=None):
    session = MagicMock()
    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=cached)
    session.execute = AsyncMock(return_value=result)
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


def _llm_response(content: str):
    response = MagicMock()
    message = MagicMock()
    message.content = content
    choice = MagicMock()
    choice.message = message
    response.choices = [choice]
    return response


@pytest.fixture
def with_key(monkeypatch):
    monkeypatch.setattr(settings, "deepseek_api_key", "test-key")


async def test_complete_json_parses_and_caches(monkeypatch, with_key):
    fake = MagicMock()
    fake.chat.completions.create = AsyncMock(
        return_value=_llm_response(json.dumps({"items": [{"requirement": "x"}]}))
    )
    monkeypatch.setattr(llm_analysis, "llm", fake)
    session = _session()

    result = await llm_analysis.complete_json(
        session, "ocds-1", "v1", "system", "user", validator=lambda d: "items" in d
    )

    assert result == {"items": [{"requirement": "x"}]}
    session.add.assert_called_once()
    session.commit.assert_awaited()


async def test_complete_json_retries_once_then_succeeds(monkeypatch, with_key):
    fake = MagicMock()
    fake.chat.completions.create = AsyncMock(
        side_effect=[
            _llm_response("not json"),
            _llm_response(json.dumps({"items": []})),
        ]
    )
    monkeypatch.setattr(llm_analysis, "llm", fake)

    result = await llm_analysis.complete_json(
        _session(), "ocds-1", "v1", "system", "user"
    )

    assert result == {"items": []}
    assert fake.chat.completions.create.await_count == 2


async def test_complete_json_without_key_returns_none(monkeypatch):
    monkeypatch.setattr(settings, "deepseek_api_key", "")
    fake = MagicMock()
    fake.chat.completions.create = AsyncMock()
    monkeypatch.setattr(llm_analysis, "llm", fake)

    result = await llm_analysis.complete_json(
        _session(), "ocds-1", "v1", "system", "user"
    )

    assert result is None
    fake.chat.completions.create.assert_not_awaited()


async def test_complete_json_uses_cache(monkeypatch, with_key):
    cached = MagicMock()
    cached.result = {"items": [{"requirement": "cached"}]}
    fake = MagicMock()
    fake.chat.completions.create = AsyncMock()
    monkeypatch.setattr(llm_analysis, "llm", fake)

    result = await llm_analysis.complete_json(
        _session(cached), "ocds-1", "v1", "system", "user"
    )

    assert result == {"items": [{"requirement": "cached"}]}
    fake.chat.completions.create.assert_not_awaited()
