"""
Fetch live tenders from the MTender OCDS API and upsert them into the database.

Usage (from backend/):
    python -m scripts.fetch_mtender                        # last 7 days, up to 200 tenders
    python -m scripts.fetch_mtender --start 2024-01-01     # from a specific date
    python -m scripts.fetch_mtender --limit 500            # fetch more
    python -m scripts.fetch_mtender --start 2024-01-01 --limit 2000

The script is idempotent: re-running it upserts on ocds_id, so duplicates are skipped.

Two HTTP requests are made per tender:
  1. GET /tenders/{ocid}          → compiledRelease  (awards, docs, CPV, deadline)
  2. GET {cn_package_url}         → CN release       (title, buyer, estimated value, method)
"""

from __future__ import annotations

import argparse
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import app.models  # noqa: F401 — registers all ORM classes with Base.metadata  # noqa: F401 — registers all ORM classes with Base.metadata
import httpx
from app.core.database import AsyncSessionLocal
from app.models.award import Award
from app.models.board import BoardEntry
from app.models.bid import BidStatistic
from app.models.buyer import Buyer
from app.models.document import Document
from app.models.tender import Tender
from app.models.tender_change import TenderChange
from app.models.tender_item import TenderItem
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.change_tracking import build_changes, verdict_for

BASE_URL = "https://public.mtender.gov.md"
PAGE_SIZE = 100

# ocds_ids already processed in this run (a tender is handled twice: compiled + CN)
_SEEN_THIS_RUN: set[str] = set()
# Per-request timeout in seconds
TIMEOUT = 30.0

log = logging.getLogger("fetch_mtender")


# ---------------------------------------------------------------------------
# MTender API helpers
# ---------------------------------------------------------------------------


def _extract_idno(party_id: str) -> str | None:
    prefix = "MD-IDNO-"
    if party_id.startswith(prefix):
        return party_id[len(prefix) :]
    return None


SUPPLIER_ROLES = {"supplier", "tenderer", "bidder"}


def _participant_documents(compiled: dict[str, Any]) -> list[dict[str, Any]]:
    """Collect bidder/supplier documents from awards, parties and bids.

    Competitor analysis needs documents linked to the party that submitted them,
    which the plain tender document list does not provide.
    """
    found: list[dict[str, Any]] = []

    def add(doc: dict, participant_ocds_id: str | None) -> None:
        doc_id = doc.get("id")
        doc_url = doc.get("url") or doc.get("uri")
        if not doc_id or not doc_url:
            return
        found.append(
            {
                "ocds_id": doc_id,
                "url": doc_url,
                "title": doc.get("title") or doc.get("documentType"),
                "document_type": doc.get("documentType"),
                "language": doc.get("language"),
                "participant_ocds_id": participant_ocds_id,
            }
        )

    for award in compiled.get("awards") or []:
        supplier_ids = [
            s.get("id") for s in (award.get("suppliers") or []) if s.get("id")
        ]
        participant = supplier_ids[0] if supplier_ids else None
        for doc in award.get("documents") or []:
            add(doc, participant)

    for party in compiled.get("parties") or []:
        if set(party.get("roles") or []) & SUPPLIER_ROLES:
            for doc in party.get("documents") or []:
                add(doc, party.get("id"))

    bids = compiled.get("bids") or {}
    for bid in bids.get("details") or []:
        tenderers = [t.get("id") for t in (bid.get("tenderers") or []) if t.get("id")]
        participant = tenderers[0] if tenderers else bid.get("id")
        for doc in bid.get("documents") or []:
            add(doc, participant)

    return found


def _find_cn_url(packages: list[str], ocid: str) -> str | None:
    """
    The CN package URL ends with the bare OCID (no stage suffix like -PN-, -EV-).
    """
    for p in packages:
        if p.rstrip("/").endswith(ocid):
            return p
    return None


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(value, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


async def _get_compiled_release(
    client: httpx.AsyncClient, ocid: str
) -> tuple[dict[str, Any], list[str]] | None:
    """Returns (compiledRelease, packages) or None on failure."""
    try:
        resp = await client.get(f"{BASE_URL}/tenders/{ocid}", timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        log.warning("Failed to fetch compiled release for %s: %s", ocid, exc)
        return None

    records: list[dict] = data.get("records") or []
    packages: list[str] = data.get("packages") or []

    if not records:
        log.debug("No records for %s", ocid)
        return None

    compiled = records[-1].get("compiledRelease") or {}
    return compiled, packages


async def _get_cn_release(
    client: httpx.AsyncClient, cn_url: str
) -> dict[str, Any] | None:
    """Returns the last release from the CN package, or None on failure."""
    try:
        resp = await client.get(cn_url, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        log.warning("Failed to fetch CN package %s: %s", cn_url, exc)
        return None

    releases: list[dict] = data.get("releases") or []
    if not releases:
        return None
    return releases[-1]


# ---------------------------------------------------------------------------
# Upsert helpers
# ---------------------------------------------------------------------------


async def _upsert_buyer(
    session: AsyncSession, ocds_id: str, name: str, idno: str | None
) -> int:
    """Returns the Buyer.id, using INSERT … ON CONFLICT DO UPDATE to handle races."""
    stmt = (
        pg_insert(Buyer)
        .values(ocds_id=ocds_id, name=name, idno=idno)
        .on_conflict_do_update(
            index_elements=[Buyer.ocds_id],
            set_={"name": name},
        )
        .returning(Buyer.id)
    )
    res = await session.execute(stmt)
    return res.scalar_one()


async def _upsert_tender(
    session: AsyncSession, ocds_id: str
) -> tuple[Tender, bool]:
    res = await session.execute(select(Tender).where(Tender.ocds_id == ocds_id))
    tender = res.scalar_one_or_none()
    if tender is None:
        tender = Tender(ocds_id=ocds_id)
        session.add(tender)
        await session.flush()
        return tender, True
    return tender, False


async def _upsert_award(
    session: AsyncSession,
    tender_id: int,
    ocds_id: str,
    **kwargs: Any,
) -> None:
    res = await session.execute(select(Award).where(Award.ocds_id == ocds_id))
    if res.scalar_one_or_none() is None:
        session.add(Award(ocds_id=ocds_id, tender_id=tender_id, **kwargs))


async def _auto_stage(session: AsyncSession, tender: Tender) -> None:
    target = (
        "not_interested" if verdict_for(tender.status) == "irrelevant" else "questionable"
    )
    res = await session.execute(
        select(BoardEntry).where(BoardEntry.tender_id == tender.id)
    )
    for entry in res.scalars().all():
        if entry.stage_source == "manual":
            continue
        entry.stage = target
        entry.stage_source = "auto"
        entry.stage_reason = "Actualizare detectată la resincronizare"


async def _upsert_tender_item(
    session: AsyncSession,
    tender_id: int,
    description: str,
    **kwargs: Any,
) -> None:
    res = await session.execute(
        select(TenderItem).where(
            TenderItem.tender_id == tender_id,
            TenderItem.description == description,
        )
    )
    if res.scalar_one_or_none() is None:
        session.add(
            TenderItem(
                tender_id=tender_id, description=description, **kwargs
            )
        )


async def _upsert_document(
    session: AsyncSession,
    tender_id: int,
    ocds_id: str,
    **kwargs: Any,
) -> None:
    res = await session.execute(
        select(Document).where(
            Document.ocds_id == ocds_id, Document.tender_id == tender_id
        )
    )
    if res.scalar_one_or_none() is None:
        session.add(Document(ocds_id=ocds_id, tender_id=tender_id, **kwargs))


# ---------------------------------------------------------------------------
# Core: process one OCID
# ---------------------------------------------------------------------------


async def process_ocid(
    client: httpx.AsyncClient,
    ocid: str,
    page_date: str,
) -> bool:
    """Fetch, parse and upsert one tender into its own session. Returns True on success."""

    result = await _get_compiled_release(client, ocid)
    if result is None:
        return False
    compiled, packages = result

    async with AsyncSessionLocal() as session:
        # --- CN release (title, buyer, value, method) ---
        cn_release: dict[str, Any] = {}
        cn_url = _find_cn_url(packages, ocid)
        if cn_url:
            cn_release = await _get_cn_release(client, cn_url) or {}
        else:
            log.debug("No CN package found for %s", ocid)

        # ---- Extract fields from compiledRelease ----
        cr_tender: dict = compiled.get("tender") or {}
        published_at = _parse_datetime(compiled.get("date") or page_date)
        status = cr_tender.get("status")
        deadline = _parse_datetime((cr_tender.get("tenderPeriod") or {}).get("endDate"))

        raw_cpv_codes: list[str] = list(
            {
                (item.get("classification") or {}).get("id", "")
                for item in (cr_tender.get("items") or [])
                if (item.get("classification") or {}).get("id")
            }
        )

        cr_documents: list[dict] = cr_tender.get("documents") or []
        cr_awards: list[dict] = compiled.get("awards") or []
        cr_parties: list[dict] = compiled.get("parties") or []

        # bid statistics (sparse — only on open competitive tenders)
        bids_block: dict = compiled.get("bids") or {}
        bid_stats_raw: list[dict] = bids_block.get("statistics") or []

        # ---- Extract fields from CN release ----
        cn_tender: dict = cn_release.get("tender") or {}
        cn_parties: list[dict] = cn_release.get("parties") or []

        title = cn_tender.get("title") or cr_tender.get("title") or ""
        description = cn_tender.get("description") or cr_tender.get("description") or ""

        value_block: dict = cn_tender.get("value") or {}
        estimated_amount: float | None = value_block.get("amount")
        currency: str = value_block.get("currency") or "MDL"

        procurement_method: str = cn_tender.get("procurementMethod") or ""
        procurement_method_details: str = (
            cn_tender.get("procurementMethodDetails") or ""
        )
        procedure_type = (
            f"{procurement_method}/{procurement_method_details}".strip("/") or None
        )

        # Deadline fallback from CN
        if deadline is None:
            deadline = _parse_datetime(
                (cn_tender.get("tenderPeriod") or {}).get("endDate")
            )

        # ---- Buyer from CN parties ----
        buyer_party = next(
            (p for p in cn_parties if "buyer" in (p.get("roles") or [])),
            None,
        )
        buyer_id_db: int | None = None
        buyer_ocds_id: str | None = None
        buyer_name: str | None = None

        if buyer_party:
            buyer_ocds_id = buyer_party.get("id") or ""
            buyer_name = (buyer_party.get("name") or "").strip()
            buyer_idno = _extract_idno(buyer_ocds_id)
            if buyer_ocds_id and buyer_name:
                buyer_id_db = await _upsert_buyer(
                    session, buyer_ocds_id, buyer_name, buyer_idno
                )

        # ---- Upsert Tender ----
        first_this_run = ocid not in _SEEN_THIS_RUN
        _SEEN_THIS_RUN.add(ocid)
        tender, created = await _upsert_tender(session, ocid)
        previous = (
            {
                "deadline": tender.submission_deadline,
                "estimated_amount": tender.estimated_amount,
                "status": tender.status,
                "title": tender.title,
            }
            if (first_this_run and not created)
            else None
        )
        tender.title = title or tender.title
        tender.description = description or tender.description
        tender.buyer_id = buyer_id_db or tender.buyer_id
        tender.buyer_ocds_id = buyer_ocds_id or tender.buyer_ocds_id
        tender.buyer_name = buyer_name or tender.buyer_name
        tender.estimated_amount = (
            estimated_amount
            if estimated_amount is not None
            else tender.estimated_amount
        )
        tender.currency = currency
        tender.published_at = published_at or tender.published_at
        tender.submission_deadline = deadline or tender.submission_deadline
        tender.cpv_codes = raw_cpv_codes or tender.cpv_codes
        tender.procedure_type = procedure_type or tender.procedure_type
        tender.status = status or tender.status
        tender.ocds_packages = packages or tender.ocds_packages

        await session.flush()

        if previous is not None:
            current = {
                "deadline": tender.submission_deadline,
                "estimated_amount": tender.estimated_amount,
                "status": tender.status,
                "title": tender.title,
            }
            detected = build_changes(previous, current)
            if detected:
                session.add(
                    TenderChange(
                        tender_id=tender.id,
                        synced_at=datetime.now(timezone.utc),
                        changes=detected,
                        verdict=verdict_for(tender.status),
                        reason={"text": "; ".join(detected), "citations": []},
                    )
                )
                await _auto_stage(session, tender)

        # ---- Awards ----
        # Build a supplier lookup from all parties
        supplier_by_ocds_id: dict[str, dict] = {
            p["id"]: p for p in (cr_parties + cn_parties) if p.get("id")
        }

        for award in cr_awards:
            award_ocds_id = award.get("id")
            if not award_ocds_id:
                continue

            award_status = award.get("status")
            award_value: dict = award.get("value") or {}
            award_amount: float | None = award_value.get("amount")
            award_currency: str = award_value.get("currency") or "MDL"
            award_date = _parse_datetime(award.get("date"))

            suppliers: list[dict] = award.get("suppliers") or []
            if suppliers:
                for sup in suppliers:
                    sup_id = sup.get("id") or ""
                    sup_party = supplier_by_ocds_id.get(sup_id) or sup
                    sup_name = (sup_party.get("name") or sup.get("name") or "").strip()
                    sup_idno = _extract_idno(sup_id)

                    # Disambiguate ocds_id when there are multiple suppliers per award
                    row_ocds_id = (
                        f"{award_ocds_id}-{sup_id}"
                        if len(suppliers) > 1
                        else award_ocds_id
                    )

                    await _upsert_award(
                        session,
                        tender.id,
                        row_ocds_id,
                        supplier_name=sup_name or None,
                        supplier_idno=sup_idno,
                        supplier_ocds_id=sup_id or None,
                        value=award_amount,
                        currency=award_currency,
                        date=award_date,
                        status=award_status,
                    )
            else:
                # unsuccessful / pending with no supplier
                await _upsert_award(
                    session,
                    tender.id,
                    award_ocds_id,
                    supplier_name=None,
                    supplier_idno=None,
                    supplier_ocds_id=None,
                    value=award_amount,
                    currency=award_currency,
                    date=award_date,
                    status=award_status,
                )

        # ---- Documents ----
        for doc in cr_documents:
            doc_id = doc.get("id")
            doc_url = doc.get("url") or doc.get("uri")
            if not doc_id or not doc_url:
                continue
            await _upsert_document(
                session,
                tender.id,
                doc_id,
                url=doc_url,
                title=doc.get("title") or doc.get("documentType"),
                document_type=doc.get("documentType"),
                language=doc.get("language"),
            )

        # ---- Participant (bidder/supplier) documents ----
        for pdoc in _participant_documents(compiled):
            await _upsert_document(
                session,
                tender.id,
                pdoc["ocds_id"],
                url=pdoc["url"],
                title=pdoc["title"],
                document_type=pdoc["document_type"],
                language=pdoc["language"],
                participant_ocds_id=pdoc["participant_ocds_id"],
            )

        # ---- Tender line items ----
        for row in cr_tender.get("items") or []:
            description = (row.get("description") or "").strip()
            if not description:
                continue
            await _upsert_tender_item(
                session,
                tender.id,
                description,
                cpv_code=(row.get("classification") or {}).get("id"),
                quantity=row.get("quantity"),
                unit=(row.get("unit") or {}).get("name"),
                lot=row.get("relatedLot"),
            )

        # ---- Bid statistics ----
        for stat in bid_stats_raw:
            measure = stat.get("measure")
            value = stat.get("value")
            if measure is None or value is None:
                continue
            session.add(
                BidStatistic(
                    tender_id=tender.id,
                    measure=str(measure),
                    value=float(value),
                    related_lot=stat.get("relatedLot"),
                )
            )

        await session.commit()
        return True


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------


async def fetch_ocid_page(
    client: httpx.AsyncClient, offset: str
) -> list[dict[str, Any]]:
    """Returns list of {ocid, date, ...} items from one page."""
    try:
        resp = await client.get(
            f"{BASE_URL}/tenders/",
            params={"offset": offset},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json().get("data") or []
    except Exception as exc:
        log.warning("Pagination request failed (offset=%s): %s", offset, exc)
        return []


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


async def run(start_iso: str, limit: int, concurrency: int) -> None:
    log.info(
        "Starting MTender ingest: start=%s limit=%d concurrency=%d",
        start_iso,
        limit,
        concurrency,
    )

    async with httpx.AsyncClient(follow_redirects=True) as client:
        offset = start_iso
        fetched = 0
        skipped = 0

        sem = asyncio.Semaphore(concurrency)

        async def process_with_sem(ocid: str, date_str: str) -> None:
            nonlocal fetched, skipped
            async with sem:
                ok = await process_ocid(client, ocid, date_str)
                if ok:
                    fetched += 1
                else:
                    skipped += 1

        while fetched + skipped < limit:
            items = await fetch_ocid_page(client, offset)
            if not items:
                log.info("No more pages (last offset=%s)", offset)
                break

            # Cap to the remaining budget before scheduling tasks
            remaining = limit - (fetched + skipped)
            batch = []
            for item in items[:remaining]:
                ocid = item.get("ocid")
                date_str = item.get("date") or offset
                if ocid:
                    batch.append(process_with_sem(ocid, date_str))

            await asyncio.gather(*batch)

            log.info(
                "Page done — fetched=%d skipped=%d total_seen=%d",
                fetched,
                skipped,
                fetched + skipped,
            )

            # Advance offset to the date of the last item in this page
            last_date = items[-1].get("date")
            if not last_date or last_date == offset:
                log.info("Offset did not advance — stopping to avoid infinite loop")
                break
            offset = last_date

        log.info("Finished. Inserted/updated: %d, skipped: %d", fetched, skipped)


def _parse_args() -> argparse.Namespace:
    default_start = (datetime.now(timezone.utc) - timedelta(days=7)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    parser = argparse.ArgumentParser(
        description="Fetch MTender tenders into the local DB"
    )
    parser.add_argument(
        "--start",
        default=default_start,
        help="ISO 8601 offset to start from (default: 7 days ago)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=200,
        help="Max number of tenders to process (default: 200)",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=5,
        help="Parallel requests per page (default: 5)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show debug logs",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    asyncio.run(run(args.start, args.limit, args.concurrency))
