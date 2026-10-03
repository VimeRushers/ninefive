#!/usr/bin/env python3
"""
MTender ingestion script.

Pulls tenders from the public MTender OCDS API, makes the two required
requests per tender (compiled release + CN package), and writes structured
data into the database.

Usage (from backend/):
    python -m scripts.ingest --start 2024-01-01 [--end 2024-04-01] [--limit 500]

Options:
    --start    ISO 8601 date/datetime (required); pagination begins here.
    --end      ISO 8601 date/datetime (optional, exclusive); stop when tender
               date >= end.
    --limit    Maximum number of tenders to ingest then stop.
    --workers  Concurrent tender-fetch workers (default: 4).
    --log-level  DEBUG | INFO | WARNING (default: INFO).

The script is idempotent: re-running over the same date window updates
existing rows instead of duplicating them.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from datetime import datetime, timezone
from typing import Any

import app.models  # noqa: F401  — registers all ORM classes with Base.metadata
import httpx
from app.core.config import settings
from app.models.award import Award
from app.models.bid import BidStatistic
from app.models.buyer import Buyer
from app.models.document import Document
from app.models.tender import Tender
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

logger = logging.getLogger("ingest")

# MTender public API
MTENDER_BASE = "https://public.mtender.gov.md/tenders"

# HTTP tunables
REQUEST_TIMEOUT = 30.0  # seconds per individual HTTP call
RETRY_ATTEMPTS = 3
RETRY_BACKOFF = 1.5  # exponential base (seconds)
PAGE_DELAY = 0.3  # polite pause between pagination requests


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


async def _get_json(client: httpx.AsyncClient, url: str) -> Any:
    """
    GET *url* and return parsed JSON.
    Retries up to RETRY_ATTEMPTS times on transient network / 5xx errors.
    """
    last_exc: Exception | None = None
    for attempt in range(RETRY_ATTEMPTS):
        try:
            resp = await client.get(url, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            return resp.json()
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            last_exc = exc
            if attempt < RETRY_ATTEMPTS - 1:
                wait = RETRY_BACKOFF**attempt
                logger.debug(
                    "Attempt %d failed for %s (%s), retrying in %.1fs",
                    attempt + 1,
                    url,
                    exc,
                    wait,
                )
                await asyncio.sleep(wait)
    raise RuntimeError(
        f"Failed to GET {url} after {RETRY_ATTEMPTS} attempts: {last_exc}"
    ) from last_exc


async def fetch_page(client: httpx.AsyncClient, offset_iso: str) -> list[dict]:
    """Return the `data` array from one pagination page."""
    data = await _get_json(client, f"{MTENDER_BASE}/?offset={offset_iso}")
    return data.get("data", [])


async def fetch_compiled_release(
    client: httpx.AsyncClient, ocid: str
) -> tuple[dict, list[str]]:
    """
    GET /tenders/{ocid}.
    Returns (compiledRelease dict from records[-1], packages list).
    """
    data = await _get_json(client, f"{MTENDER_BASE}/{ocid}")
    records: list[dict] = data.get("records", [])
    packages: list[str] = data.get("packages", [])
    if not records:
        raise ValueError(f"No records in response for {ocid}")
    compiled: dict = records[-1].get("compiledRelease", {})
    return compiled, packages


async def fetch_cn_release(
    client: httpx.AsyncClient, packages: list[str], ocid: str
) -> dict:
    """
    Find the CN (contract notice) package — the one whose last URL path
    segment equals the OCID exactly (no stage suffix like -PN-, -EV-) —
    then return releases[-1] from that package.
    """
    cn_url = find_cn_url(packages, ocid)
    if cn_url is None:
        logger.warning("No CN package found for %s (packages=%s)", ocid, packages)
        return {}
    data = await _get_json(client, cn_url)
    releases: list[dict] = data.get("releases", [])
    return releases[-1] if releases else {}


# ---------------------------------------------------------------------------
# Data extraction utilities
# ---------------------------------------------------------------------------


def parse_datetime(value: str | None) -> datetime | None:
    """Parse an ISO 8601 string to a timezone-aware datetime, or return None."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except (ValueError, AttributeError):
        return None


def extract_idno(party_id: str | None) -> str | None:
    """Extract the 13-digit IDNO from an "MD-IDNO-{idno}" party identifier."""
    if party_id and party_id.startswith("MD-IDNO-"):
        idno = party_id.removeprefix("MD-IDNO-")
        return idno if idno else None
    return None


def extract_cpv_codes(items: list[dict]) -> list[str]:
    """Collect unique CPV classification IDs from tender items."""
    seen: set[str] = set()
    for item in items:
        code = item.get("classification", {}).get("id")
        if code:
            seen.add(str(code))
    return sorted(seen)


def find_buyer_party(parties: list[dict]) -> dict | None:
    for p in parties:
        if "buyer" in p.get("roles", []):
            return p
    return None


def find_cn_url(packages: list[str], ocid: str) -> str | None:
    """
    Return the CN (contract notice) package URL from *packages*.

    The CN package is the one whose last path segment equals the OCID
    exactly — no stage suffix like -PN-, -EV-, or -NP-.
    Returns None if no match is found.
    """
    for p in packages:
        if p.rstrip("/").endswith(ocid):
            return p
    return None


# ---------------------------------------------------------------------------
# Database upsert helpers
# ---------------------------------------------------------------------------


async def upsert_buyer(
    session: AsyncSession,
    ocds_id: str,
    name: str,
    idno: str | None,
) -> int:
    """Upsert a buyer row by ocds_id and return its PK."""
    stmt = (
        pg_insert(Buyer)
        .values(ocds_id=ocds_id, name=name, idno=idno)
        .on_conflict_do_update(
            index_elements=["ocds_id"],
            set_={"name": name, "idno": idno},
        )
        .returning(Buyer.id)
    )
    result = await session.execute(stmt)
    return result.scalar_one()


async def upsert_tender(
    session: AsyncSession,
    *,
    ocds_id: str,
    title: str | None,
    description: str | None,
    buyer_id: int | None,
    buyer_ocds_id: str | None,
    buyer_name: str | None,
    estimated_amount: float | None,
    currency: str,
    published_at: datetime | None,
    submission_deadline: datetime | None,
    cpv_codes: list[str],
    procedure_type: str | None,
    status: str | None,
    raw_ocds: dict,
    ocds_packages: list[str],
) -> int:
    """Upsert a tender row by ocds_id and return its PK."""
    values: dict[str, Any] = {
        "ocds_id": ocds_id,
        "title": title,
        "description": description,
        "buyer_id": buyer_id,
        "buyer_ocds_id": buyer_ocds_id,
        "buyer_name": buyer_name,
        "estimated_amount": estimated_amount,
        "currency": currency,
        "published_at": published_at,
        "submission_deadline": submission_deadline,
        "cpv_codes": cpv_codes,
        "procedure_type": procedure_type,
        "status": status,
        "raw_ocds": raw_ocds,
        "ocds_packages": ocds_packages,
    }
    # Everything except the conflict key is fair game for update
    update_set = {k: v for k, v in values.items() if k != "ocds_id"}
    stmt = (
        pg_insert(Tender)
        .values(**values)
        .on_conflict_do_update(index_elements=["ocds_id"], set_=update_set)
        .returning(Tender.id)
    )
    result = await session.execute(stmt)
    return result.scalar_one()


async def upsert_awards(
    session: AsyncSession, tender_id: int, awards: list[dict]
) -> None:
    """
    Upsert one Award row per entry in *awards*.

    Edge cases handled per the API notes:
    - status=unsuccessful → suppliers=[], value=None (stored anyway)
    - status=pending      → directAward in progress; supplier + value present
    - Multiple awards     → one row each (multi-lot)
    """
    for award in awards:
        ocds_id = award.get("id")
        if not ocds_id:
            continue

        suppliers: list[dict] = award.get("suppliers", [])
        supplier = suppliers[0] if suppliers else {}
        supplier_ocds_id = supplier.get("id")
        supplier_name = supplier.get("name")
        supplier_idno = extract_idno(supplier_ocds_id)

        value_block = award.get("value") or {}
        value: float | None = value_block.get("amount")
        currency: str = value_block.get("currency") or "MDL"
        status = award.get("status")
        date = parse_datetime(award.get("date"))

        row = {
            "ocds_id": ocds_id,
            "tender_id": tender_id,
            "supplier_name": supplier_name,
            "supplier_idno": supplier_idno,
            "supplier_ocds_id": supplier_ocds_id,
            "value": value,
            "currency": currency,
            "date": date,
            "status": status,
        }
        update_set = {k: v for k, v in row.items() if k != "ocds_id"}
        stmt = (
            pg_insert(Award)
            .values(**row)
            .on_conflict_do_update(index_elements=["ocds_id"], set_=update_set)
        )
        await session.execute(stmt)


async def replace_bid_stats(
    session: AsyncSession, tender_id: int, stats: list[dict]
) -> None:
    """
    Replace bid statistics for *tender_id*.

    BidStatistic has no natural unique key, so we delete-then-insert.
    This table is intentionally sparse: directAward and unsuccessful tenders
    have no bid statistics — that is expected, not an error.
    """
    await session.execute(
        delete(BidStatistic).where(BidStatistic.tender_id == tender_id)
    )
    for stat in stats:
        measure = stat.get("measure")
        raw_value = stat.get("value")
        if measure is None or raw_value is None:
            continue
        session.add(
            BidStatistic(
                tender_id=tender_id,
                measure=measure,
                value=float(raw_value),
                related_lot=stat.get("relatedLot"),
            )
        )


async def upsert_documents(
    session: AsyncSession, tender_id: int, docs: list[dict]
) -> None:
    """
    Upsert documents using (tender_id, ocds_id) as the logical key.

    Documents are only present on some tenders (mainly open procedure).
    Direct awards typically have none — that is expected.
    """
    for doc in docs:
        url = doc.get("url") or doc.get("uri")
        if not url:
            continue
        ocds_id = doc.get("id", "")

        result = await session.execute(
            select(Document).where(
                Document.tender_id == tender_id,
                Document.ocds_id == ocds_id,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.url = url
            existing.title = doc.get("title")
            existing.document_type = doc.get("documentType")
            existing.language = doc.get("language")
        else:
            session.add(
                Document(
                    ocds_id=ocds_id,
                    tender_id=tender_id,
                    url=url,
                    title=doc.get("title"),
                    document_type=doc.get("documentType"),
                    language=doc.get("language"),
                )
            )


# ---------------------------------------------------------------------------
# Per-tender orchestration
# ---------------------------------------------------------------------------


async def ingest_one(
    session: AsyncSession,
    client: httpx.AsyncClient,
    ocid: str,
    page_date: str,
) -> None:
    """Fetch, parse, and persist one tender (both requests)."""
    try:
        compiled, packages = await fetch_compiled_release(client, ocid)
        cn_release = await fetch_cn_release(client, packages, ocid)
    except Exception as exc:
        logger.error("Skipping %s — fetch error: %s", ocid, exc)
        return

    tender_block: dict = compiled.get("tender", {})
    cn_tender: dict = cn_release.get("tender", {})

    # --- Buyer (from CN parties; fall back to compiledRelease parties) ---
    parties: list[dict] = cn_release.get("parties") or compiled.get("parties", [])
    buyer_party = find_buyer_party(parties)
    buyer_id: int | None = None
    buyer_ocds_id: str | None = None
    buyer_name: str | None = None

    if buyer_party:
        buyer_ocds_id = buyer_party.get("id")
        buyer_name = buyer_party.get("name", "")
        if buyer_ocds_id and buyer_name:
            buyer_idno = extract_idno(buyer_ocds_id)
            buyer_id = await upsert_buyer(
                session, buyer_ocds_id, buyer_name, buyer_idno
            )

    # --- Deadline (compiledRelease first, CN as fallback) ---
    deadline = parse_datetime(
        tender_block.get("tenderPeriod", {}).get("endDate")
        or cn_tender.get("tenderPeriod", {}).get("endDate")
    )

    # --- CPV codes (deduplicated) ---
    cpv_codes = extract_cpv_codes(tender_block.get("items", []))

    # --- Procedure type (CN is the authoritative source) ---
    method = cn_tender.get("procurementMethod")
    method_details = cn_tender.get("procurementMethodDetails")
    if method and method_details:
        procedure_type: str | None = f"{method}/{method_details}"
    else:
        procedure_type = method_details or method

    # --- Estimated value (CN is the authoritative source) ---
    value_block = cn_tender.get("value") or {}
    estimated_amount: float | None = value_block.get("amount")
    currency: str = value_block.get("currency") or "MDL"

    # --- Title / description (CN preferred) ---
    title = cn_tender.get("title") or tender_block.get("title")
    description = cn_tender.get("description") or tender_block.get("description")

    # --- Status ---
    status = tender_block.get("status") or cn_tender.get("status")

    # --- Published date ---
    published_at = parse_datetime(compiled.get("date") or page_date)

    # --- Upsert tender row ---
    tender_id = await upsert_tender(
        session,
        ocds_id=ocid,
        title=title,
        description=description,
        buyer_id=buyer_id,
        buyer_ocds_id=buyer_ocds_id,
        buyer_name=buyer_name,
        estimated_amount=estimated_amount,
        currency=currency,
        published_at=published_at,
        submission_deadline=deadline,
        cpv_codes=cpv_codes,
        procedure_type=procedure_type,
        status=status,
        raw_ocds=compiled,
        ocds_packages=packages,
    )

    # --- Awards (from compiledRelease — authoritative for awards/parties) ---
    awards: list[dict] = compiled.get("awards", [])
    await upsert_awards(session, tender_id, awards)

    # --- Bid statistics (sparse by design) ---
    stats: list[dict] = compiled.get("bids", {}).get("statistics", [])
    await replace_bid_stats(session, tender_id, stats)

    # --- Documents (only on some open-procedure tenders) ---
    docs: list[dict] = tender_block.get("documents", [])
    await upsert_documents(session, tender_id, docs)

    await session.commit()
    logger.info(
        "OK  %s | %-60s | awards=%d  docs=%d  stats=%d",
        ocid,
        (title or "—")[:60],
        len(awards),
        len(docs),
        len(stats),
    )


# ---------------------------------------------------------------------------
# Pagination + concurrency loop
# ---------------------------------------------------------------------------


async def run(
    start: datetime,
    end: datetime | None,
    limit: int | None,
    workers: int,
) -> None:
    engine = create_async_engine(
        settings.database_url, echo=False, pool_size=workers + 2
    )
    SessionFactory = async_sessionmaker(engine, expire_on_commit=False)
    sem = asyncio.Semaphore(workers)

    total = 0
    offset_iso = start.isoformat()
    stop = False

    async with httpx.AsyncClient() as client:
        while not stop:
            page = await fetch_page(client, offset_iso)
            if not page:
                logger.info(
                    "Empty page at offset=%s — reached end of data.", offset_iso
                )
                break

            tasks: list[asyncio.Task] = []

            for item in page:
                ocid: str | None = item.get("ocid")
                item_date: str = item.get("date", "")

                if not ocid:
                    continue

                item_dt = parse_datetime(item_date)
                if end and item_dt and item_dt >= end:
                    logger.info("Reached end boundary %s — stopping.", end.date())
                    stop = True
                    break

                if limit is not None and total >= limit:
                    logger.info("Reached --limit %d — stopping.", limit)
                    stop = True
                    break

                total += 1

                # Capture loop variables via closure factory to avoid late-binding
                async def _make_task(o: str, d: str) -> None:
                    async with sem, SessionFactory() as session:
                        await ingest_one(session, client, o, d)

                tasks.append(asyncio.create_task(_make_task(ocid, item_date)))

            results = await asyncio.gather(*tasks, return_exceptions=True)
            for result in results:
                if isinstance(result, BaseException):
                    logger.error("Worker raised: %s", result)

            # Advance offset to the last item's date
            last_date = page[-1].get("date", "")
            if not last_date or last_date == offset_iso:
                logger.warning(
                    "Offset did not advance (last_date=%r); stopping to avoid loop.",
                    last_date,
                )
                break
            offset_iso = last_date

            if not stop:
                await asyncio.sleep(PAGE_DELAY)

    await engine.dispose()
    logger.info("Ingestion complete. Tenders processed: %d", total)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest MTender tenders from a date range into the database.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--start",
        required=True,
        metavar="ISO_DATE",
        help="Start of fetch window, e.g. 2024-01-01 or 2024-01-01T00:00:00",
    )
    parser.add_argument(
        "--end",
        default=None,
        metavar="ISO_DATE",
        help="Exclusive end of fetch window (optional)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        metavar="N",
        help="Stop after ingesting N tenders",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        metavar="N",
        help="Concurrent worker count (default: 4)",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging verbosity (default: INFO)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=args.log_level,
        format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )

    start_dt = parse_datetime(
        args.start + "T00:00:00" if "T" not in args.start else args.start
    )
    if start_dt is None:
        sys.exit(f"Invalid --start value: {args.start!r}")

    end_dt: datetime | None = None
    if args.end:
        end_dt = parse_datetime(
            args.end + "T00:00:00" if "T" not in args.end else args.end
        )
        if end_dt is None:
            sys.exit(f"Invalid --end value: {args.end!r}")

    asyncio.run(run(start=start_dt, end=end_dt, limit=args.limit, workers=args.workers))


if __name__ == "__main__":
    main()
