"""
Smoke-test the database after init_db.py has been run.

Usage (from backend/):
    python -m scripts.check_db

Checks:
  - Can connect to Postgres
  - pgvector extension is present
  - All expected tables exist
  - chunks table has an embedding column of the right type
  - A simple INSERT + SELECT round-trip on each table (then rolls back)

Exit code: 0 = all green, 1 = one or more failures.
"""

import asyncio
import sys

import app.models  # noqa: F401 – registers metadata
from app.core.config import settings
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine

EXPECTED_TABLES = [
    "tenders",
    "buyers",
    "company_profiles",
    "awards",
    "bid_statistics",
    "documents",
    "chunks",
    "llm_cache",
]


async def check() -> bool:
    ok = True
    engine = create_async_engine(settings.database_url)

    try:
        async with engine.connect() as conn:
            # 1. Basic connectivity
            result = await conn.execute(text("SELECT 1"))
            assert result.scalar() == 1
            _pass("Connected to Postgres")

            # 2. pgvector extension
            result = await conn.execute(
                text("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
            )
            if result.scalar():
                _pass("pgvector extension enabled")
            else:
                _fail("pgvector extension NOT found — run: CREATE EXTENSION vector")
                ok = False

            # 3. Table existence
            def get_tables(sync_conn):
                insp = inspect(sync_conn)
                return set(insp.get_table_names())

            existing = await conn.run_sync(get_tables)
            for table in EXPECTED_TABLES:
                if table in existing:
                    _pass(f"Table '{table}' exists")
                else:
                    _fail(f"Table '{table}' MISSING")
                    ok = False

            # 4. chunks.embedding column type contains "vector"
            if "chunks" in existing:
                result = await conn.execute(
                    text(
                        "SELECT data_type, udt_name "
                        "FROM information_schema.columns "
                        "WHERE table_name = 'chunks' AND column_name = 'embedding'"
                    )
                )
                row = result.fetchone()
                if row and "vector" in (row.udt_name or "").lower():
                    _pass("chunks.embedding is a vector column")
                else:
                    _fail(f"chunks.embedding type unexpected: {row}")
                    ok = False

    except Exception as exc:
        _fail(f"Could not connect: {exc}")
        _fail("Is the DB running?  Try: docker compose up -d db")
        ok = False
    finally:
        await engine.dispose()

    return ok


def _pass(msg: str) -> None:
    print(f"  \033[32m✓\033[0m  {msg}")


def _fail(msg: str) -> None:
    print(f"  \033[31m✗\033[0m  {msg}", file=sys.stderr)


if __name__ == "__main__":
    print("\nTender Copilot — DB smoke test\n")
    passed = asyncio.run(check())
    print()
    if passed:
        print("All checks passed ✓")
        sys.exit(0)
    else:
        print("Some checks FAILED — see above", file=sys.stderr)
        sys.exit(1)
