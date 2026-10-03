"""
Ingest sample MTender / OCDS tenders and demo profile into the database.
Usage (from backend/):
    python -m scripts.ingest
Idempotent: safe to run several times.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import app.models  # noqa: F401
from app.core.database import AsyncSessionLocal
from app.models.award import Award
from app.models.board import BoardEntry
from app.models.buyer import Buyer
from app.models.catalogue import CatalogueItem
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.pricelist import Pricelist
from app.models.profile import CompanyProfile
from app.models.tender import Tender
from app.models.tender_item import TenderItem
from sqlalchemy import select

DEMO_IDNO = "1009600012346"


async def _seed_demo_profile(session) -> None:
    profile = (
        await session.execute(
            select(CompanyProfile).where(CompanyProfile.idno == DEMO_IDNO)
        )
    ).scalar_one_or_none()
    if profile is None:
        profile = CompanyProfile(
            idno=DEMO_IDNO,
            name="TehnoServ Grup SRL",
            description=(
                "Distribuitor de echipamente IT și de birou: laptopuri, monitoare, "
                "servere și consumabile, în toată Republica Moldova."
            ),
            cpv_codes=["30213100-6", "30231000-7", "48820000-2"],
            regions=["Chișinău", "Bălți"],
            budget_min=50000.0,
            budget_max=2000000.0,
            annual_turnover={"amount": 3200000.0, "currency": "MDL"},
            employee_count=18,
            licenses=[],
            certifications=["ISO 9001:2015"],
        )
        session.add(profile)
        await session.flush()

    pricelists = (
        await session.execute(
            select(Pricelist).where(Pricelist.profile_id == profile.id)
        )
    ).scalars().all()
    if not pricelists:
        pricelist = Pricelist(
            profile_id=profile.id,
            file_name="catalog-tehnoserv-2026.csv",
            status="ready",
            item_count=3,
        )
        session.add(pricelist)
        await session.flush()
        for name, description, amount in [
            ("Laptop business 15.6 inch", "Laptop Dell Latitude 5540, i5, 16GB, 512GB SSD", 14500.0),
            ("Monitor 24 inch IPS", "Monitor Dell P2422H 24 inch Full HD", 3200.0),
            ("Server rack 2U", "Server Dell PowerEdge R750, 128GB RAM, 4TB NVMe", 210000.0),
        ]:
            session.add(
                CatalogueItem(
                    pricelist_id=pricelist.id,
                    name=name,
                    description=description,
                    price={"amount": amount, "currency": "MDL"},
                )
            )
        await session.flush()

    tender = (
        await session.execute(select(Tender).where(Tender.ocds_id == "ocds-t-001"))
    ).scalar_one_or_none()
    if tender is not None:
        items = (
            await session.execute(
                select(TenderItem).where(TenderItem.tender_id == tender.id)
            )
        ).scalars().all()
        if not items:
            for description, cpv, quantity in [
                ("Laptopuri performante pentru școli", "30213100-6", 30.0),
                ("Monitoare pentru instituțiile de învățământ", "30231000-7", 30.0),
            ]:
                session.add(
                    TenderItem(
                        tender_id=tender.id,
                        description=description,
                        cpv_code=cpv,
                        quantity=quantity,
                        unit="buc",
                    )
                )
        entry = (
            await session.execute(
                select(BoardEntry).where(
                    BoardEntry.profile_id == profile.id,
                    BoardEntry.tender_id == tender.id,
                )
            )
        ).scalar_one_or_none()
        if entry is None:
            session.add(
                BoardEntry(
                    profile_id=profile.id,
                    tender_id=tender.id,
                    stage="new",
                    stage_source="auto",
                )
            )

    await session.commit()
    print("Demo company profile and catalogue ready.")


async def seed_data() -> None:
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as session:
        existing = (
            await session.execute(
                select(Tender.ocds_id).where(Tender.ocds_id == "ocds-t-001")
            )
        ).scalar_one_or_none()

        if existing is None:
            print("Seeding sample buyers, tenders, documents, and awards...")

            b1 = Buyer(
                ocds_id="ocds-buyer-001",
                name="Primăria Municipiului Chișinău",
                idno="1007601009876",
                region="Chișinău",
            )
            session.add(b1)
            await session.flush()

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

            session.add(
                Award(
                    ocds_id="ocds-a-001",
                    tender_id=t1.id,
                    supplier_name="Infotech Solution SRL",
                    supplier_idno="1003600055443",
                    value=420000.0,
                    currency="MDL",
                    date=now - timedelta(days=40),
                    status="active",
                )
            )

            d1 = Document(
                ocds_id="ocds-doc-001",
                tender_id=t1.id,
                url="https://storage.mtender.gov.md/doc1.pdf",
                title="Caiet de sarcini IT",
                processed=True,
            )
            session.add(d1)
            await session.flush()

            session.add(
                Chunk(
                    document_id=d1.id,
                    tender_id=t1.id,
                    page_number=1,
                    text="Caiet de sarcini: Echipamentele trebuie să fie noi, livrate în ambalaj original cu garanție minim 24 luni.",
                )
            )

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
                submission_deadline=now + timedelta(days=4),
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

            session.add(
                Chunk(
                    document_id=d2.id,
                    tender_id=t2.id,
                    page_number=1,
                    text="Specificații tehnice: Server Dell PowerEdge R750 cu 128GB RAM și 4TB NVMe.",
                )
            )
            session.add(
                Chunk(
                    document_id=d2.id,
                    tender_id=t2.id,
                    page_number=3,
                    text="Caiet de sarcini: dimensiunile rackului de exact 600 x 1200 mm, fără toleranță.",
                )
            )

            await session.commit()
            print("Database seeded with sample procurement data.")
        else:
            print("Sample tenders already present, skipping tender seed.")

        await _seed_demo_profile(session)


if __name__ == "__main__":
    asyncio.run(seed_data())
