"""
Document download and text extraction script.
Usage (from backend/):
    python -m scripts.fetch_docs
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import app.models  # noqa: F401
import httpx
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.tender import Tender
from sqlalchemy import select

# storage.mtender.gov.md resets requests without a browser-like User-Agent
BROWSER_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import selectinload


def extract_pages_from_pdf(pdf_path: Path) -> list[tuple[int, str]]:
    """
    Extract text page by page.
    Uses pdfplumber first; falls back to pytesseract OCR for scanned pages (< 50 chars/page).
    """
    pages: list[tuple[int, str]] = []
    try:
        import pdfplumber

        with pdfplumber.open(pdf_path) as pdf:
            for idx, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                if len(text.strip()) < 50:
                    # Attempt OCR if pytesseract is available
                    try:
                        import pytesseract

                        pil_image = page.to_image(resolution=200).original
                        ocr_text = pytesseract.image_to_string(
                            pil_image, lang="ron+rus"
                        )
                        if len(ocr_text.strip()) > len(text.strip()):
                            text = ocr_text
                    except Exception:
                        pass
                pages.append((idx, text.strip()))
    except Exception as exc:
        print(f"Warning: Failed to extract with pdfplumber from {pdf_path}: {exc}")
        # Secondary fallback: PyMuPDF (fitz) if installed
        try:
            import fitz

            doc = fitz.open(pdf_path)
            for idx, page in enumerate(doc, start=1):
                text = page.get_text() or ""
                pages.append((idx, text.strip()))
        except Exception:
            pass

    return pages


async def fetch_and_process_documents() -> None:
    docs_dir = Path(settings.docs_dir)
    docs_dir.mkdir(parents=True, exist_ok=True)

    async with AsyncSessionLocal() as session:
        stmt = (
            select(Document)
            .where(Document.local_path.is_(None), Document.url.isnot(None))
            .options(selectinload(Document.tender))
        )
        res = await session.execute(stmt)
        docs = list(res.scalars().all())

        print(f"Found {len(docs)} documents to fetch.")
        if not docs:
            return

        async with httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={"User-Agent": BROWSER_UA},
        ) as http_client:
            for doc in docs:
                tender_ocds = (
                    doc.tender.ocds_id if doc.tender else f"tender_{doc.tender_id}"
                )
                target_folder = docs_dir / tender_ocds
                target_folder.mkdir(parents=True, exist_ok=True)

                suffix = ".pdf"
                if doc.url.endswith(".docx"):
                    suffix = ".docx"
                elif doc.url.endswith(".xlsx"):
                    suffix = ".xlsx"

                target_file = target_folder / f"{doc.id}{suffix}"

                print(f"Downloading {doc.url} -> {target_file}")
                try:
                    resp = await http_client.get(doc.url)
                    if resp.status_code == 429:
                        await asyncio.sleep(5)
                        resp = await http_client.get(doc.url)
                    if resp.status_code == 200:
                        target_file.write_bytes(resp.content)
                        doc.local_path = str(target_file)

                        # Extract text if PDF
                        if suffix == ".pdf":
                            pages = extract_pages_from_pdf(target_file)
                            for page_num, text in pages:
                                if text:
                                    chunk = Chunk(
                                        document_id=doc.id,
                                        tender_id=doc.tender_id,
                                        page_number=page_num,
                                        text=text,
                                    )
                                    session.add(chunk)

                        doc.processed = True
                    else:
                        print(f"Failed download {doc.url}: HTTP {resp.status_code}")
                except Exception as exc:
                    print(f"Error processing doc {doc.id}: {exc}")

                # storage.mtender.gov.md rate-limits bursts
                await asyncio.sleep(0.5)

        await session.commit()
        print("Done fetching and processing documents.")


if __name__ == "__main__":
    asyncio.run(fetch_and_process_documents())
