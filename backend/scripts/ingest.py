"""
Ingest sample MTender / OCDS tenders into database for local testing and demo.
Usage (from backend/):
    python -m scripts.ingest
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import app.models  # noqa: F401
from app.core.database import AsyncSessionLocal
from app.models.award import Award
from app.models.buyer import Buyer
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.tender import Tender


async def seed_data():
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as session:
        print("Seeding sample buyers, tenders, documents, and awards...")

        # Buyer 1: Primăria Municipiului Chișinău
        b1 = Buyer(
            ocds_id="ocds-buyer-001",
            name="Primăria Municipiului Chișinău",
            idno="1007601009876",
            region="Chișinău",
        )
        session.add(b1)
        await session.flush()

        # Tender 1: Laptopuri & Echipamente IT (Clean tender)
        t1 = Tender(
            ocds_id="ocds-t-001",
            title="Achiziționare tehnică de calcul și laptopuri pentru școli",
            description="Furnizare laptopuri performante (Intel Core i5 sau echivalent), calculatoare all-in-one și monitoare pentru instituțiile de învățământ.",
            buyer_id=b1.id,
            buyer_ocds_id=b1.ocds_id,
            buyer_name=b1.name,
            estimated_amount=450000.0,
            currency="MDL",
            published_at=now - timedelta(days=2),
            submission_deadline=now + timedelta(days=12),
            cpv_codes=["30213100-6", "30231000-7"],
            region="Chișinău",
            procedure_type="open",
            status="active",
        )
        session.add(t1)
        await session.flush()

        # Awards for buyer 1
        a1 = Award(
            ocds_id="ocds-a-001",
            tender_id=t1.id,
            supplier_name="Infotech Solution SRL",
            supplier_idno="1003600055443",
            value=420000.0,
            currency="MDL",
            date=now - timedelta(days=40),
            status="active",
        )
        session.add(a1)

        d1 = Document(
            ocds_id="ocds-doc-001",
            tender_id=t1.id,
            url="https://storage.mtender.gov.md/doc1.pdf",
            title="Caiet de sarcini IT",
            processed=True,
        )
        session.add(d1)
        await session.flush()

        # Chunks for Tender 1
        c1 = Chunk(
            document_id=d1.id,
            tender_id=t1.id,
            page_number=1,
            text="Caiet de sarcini: Echipamentele trebuie să fie noi, livrate în ambalaj original cu garanție minim 24 luni.",
        )
        session.add(c1)

        # Tender 2: Server Dedicat cu indicatori de risc (Short deadline + Brand Dell fără echivalent)
        t2 = Tender(
            ocds_id="ocds-t-002",
            title="Servere și infrastructură de stocare date",
            description="Achiziție de urgență: Server Dell PowerEdge R750 cu rack pentru centrul de date municipal.",
            buyer_id=b1.id,
            buyer_ocds_id=b1.ocds_id,
            buyer_name=b1.name,
            estimated_amount=680000.0,
            currency="MDL",
            published_at=now - timedelta(days=1),
            submission_deadline=now + timedelta(days=4),  # < 7 days
            cpv_codes=["48820000-2"],
            region="Chișinău",
            procedure_type="open",
            status="active",
        )
        session.add(t2)
        await session.flush()

        d2 = Document(
            ocds_id="ocds-doc-002",
            tender_id=t2.id,
            url="https://storage.mtender.gov.md/doc2.pdf",
            title="Caiet de sarcini Servere",
            processed=True,
        )
        session.add(d2)
        await session.flush()

        c2 = Chunk(
            document_id=d2.id,
            tender_id=t2.id,
            page_number=1,
            text="Specificații tehnice: Server Dell PowerEdge R750 cu 128GB RAM și 4TB NVMe.",
        )
        session.add(c2)

        await session.commit()
        print("Database seeded with sample procurement data.")


if __name__ == "__main__":
    asyncio.run(seed_data())
