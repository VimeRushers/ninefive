import pytest

from app.core.config import Settings


@pytest.fixture
def clean_env(monkeypatch):
    for key in (
        "PRICELISTS_DIR",
        "DEEPSEEK_TIMEOUT_SECONDS",
        "EMBED_ALLOW_FALLBACK",
        "EMBED_MODEL",
        "DOCS_DIR",
    ):
        monkeypatch.delenv(key, raising=False)


def test_new_setting_defaults(clean_env):
    settings = Settings(_env_file=None)
    assert settings.pricelists_dir == "data/pricelists"
    assert settings.deepseek_timeout_seconds == 60.0
    assert settings.deepseek_reasoning_effort == "low"
    assert settings.embed_allow_fallback is True


def test_env_override(clean_env, monkeypatch):
    monkeypatch.setenv("DEEPSEEK_TIMEOUT_SECONDS", "5")
    monkeypatch.setenv("EMBED_ALLOW_FALLBACK", "false")
    settings = Settings(_env_file=None)
    assert settings.deepseek_timeout_seconds == 5.0
    assert settings.embed_allow_fallback is False
