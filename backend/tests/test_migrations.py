from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory

BACKEND_DIR = Path(__file__).resolve().parents[1]


def _script_directory() -> ScriptDirectory:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    return ScriptDirectory.from_config(cfg)


def test_migrations_have_single_head():
    script = _script_directory()
    assert list(script.get_heads()) == ["0003_tender_items"]


def test_initial_revision_has_upgrade_and_downgrade():
    script = _script_directory()
    revision = script.get_revision("0001_initial")
    module = revision.module
    assert callable(module.upgrade)
    assert callable(module.downgrade)
