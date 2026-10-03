"""
Initialize the database schema.

Usage (from backend/):
    python -m scripts.init_db

What it does:
   1. Enables the pgvector extension (CREATE EXTENSION IF NOT EXISTS vector).
  2. Calls Base.metadata.create_all — creates every table that doesn't exist yet.
     This is idempotent: safe to run multiple times, won't drop existing data.

Prefer Alembic migrations for anything beyond a fresh database:
    alembic upgrade head

Note: create_all only creates missing tables. It will NOT add a new column to a
table that already exists. If the schema changed, either start from a fresh DB
volume or write an Alembic migration (then `alembic stamp head` on existing DBs).
"""

import asyncio
import sys

# Importing app.models registers all ORM classes with Base.metadata
import app.models  # noqa: F401
from app.core.config import settings
from app.core.database import Base
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def init() -> None:
    engine = create_async_engine(settings.database_url, echo=True)
    async with engine.begin() as conn:
        print("Enabling pgvector extension...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

        print("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)

    await engine.dispose()
    print("\nDone. Run scripts/check_db.py to verify.")


if __name__ == "__main__":
    try:
        asyncio.run(init())
    except Exception as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        print(
            "Is the database running?  Try:  docker compose up -d db",
            file=sys.stderr,
        )
        sys.exit(1)
