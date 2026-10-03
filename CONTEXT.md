# Project Context: Moldova Tender Copilot

## One-line summary
An AI assistant for Moldovan companies that finds relevant public tenders (MTender), checks whether they are eligible, flags integrity risks in the tender, and estimates how competitive the tender is. Built for a hackathon in Moldova (~24-36h, team of ~4).

## Problem
- Moldovan public procurement runs on MTender (OCDS-based, open data). Front-end platforms (e.g. achizitii.md, e-licitatie.md) offer keyword and CPV-code search plus alerts.
- CPV codes are often misclassified (by mistake or on purpose), so relevant tenders are missed.
- Search is lexical: Romanian queries miss tenders written in Russian, and synonyms are not matched.
- The real requirements live inside unstructured documents (Caiet de Sarcini / terms of reference, usually PDFs) that search does not read.
- Companies waste time reading documents only to find the tender is not suitable, or looks tailored to one supplier ("caiet de sarcini cu dedicație").
- Existing tools mostly list and alert. The gap is helping decide whether a tender is worth bidding on.

## Target user
Small and medium Moldovan companies (and potentially consultants) bidding on public tenders. UI languages: Romanian first, English second, Russian if time allows. Tender content can be Romanian or Russian.

## Core features (priority order)
1. **Semantic search**: multilingual embeddings over tender metadata and document chunks, cross-language (RO/RU), with a "why this matched" snippet.
2. **Company profile + fit score**: user enters a tax ID (IDNO) or free-text description. Fit = semantic similarity + region + budget range + past awards (if found).
3. **Red-flag / integrity indicators** (mostly rule-based, explainable):
   - unusually short submission window
   - buyer's history of single-bidder tenders
   - same winner repeatedly winning from the same buyer
   - brand names without "sau echivalent"
   - very narrow numeric tolerances in specs
   - CPV code mismatching the actual tender text (embedding-based)
   Each indicator returns evidence (data points or document page citation), not just a score.
4. **Eligibility checker**: LLM extracts requirements from the tender documents into JSON (requirement, type, threshold, source page) and compares them to the company profile: "meets 6 of 8; missing: X". Every item must cite the source page. If not found in the document, say "not found" rather than guessing.
5. **Win-chance estimate** (build last): based on historical awards: typical number of bidders, winning price versus estimated value, buyer concentration. Must be back-tested on historical data.

## Hard guardrails
- **Never state or imply that a named buyer or company is corrupt.** Use the terms "risk indicators" or "integrity signals", show the evidence, and let the user judge.
- **Active competitor bids are not public before bid opening.** Win chance is an estimate from historical patterns only. Say so in the UI.
- **Eligibility output is an assistant, not legal advice.** Human stays in the loop.
- **Every LLM-derived claim needs a citation** (document + page). No citation means do not display it as fact.
- Do not scrape private platforms in ways that violate their terms. Prefer the official API and open data.

## Data sources
- MTender OCDS API (confirmed working by the team): base URL `<FILL IN>`, endpoints used `<FILL IN>`.
- Tender documents (PDF/DOCX/scans) linked from OCDS releases: access method `<FILL IN>`.
- Unverified background claims (do not present as fact without checking): 8.8 billion MDL contested tenders in 2023; 61% concentration in health contracts in 2019; MTender analytical (BI) module disconnected in February 2024.
- The demo uses a **pre-downloaded fixed dataset** (target: several hundred to a few thousand tenders, including historical awards), not live calls.

## Architecture
- **Backend:** FastAPI (Python), Pydantic schemas shared in `schemas.py`.
- **DB:** Postgres + pgvector (single store for relational data and embeddings).
- **Ingestion:** script pulling OCDS JSON into tables: tenders, buyers, bids, awards, documents, chunks.
- **Document processing:** PyMuPDF/pdfplumber for digital PDFs; Tesseract (`ron+rus`) OCR fallback; chunk by headings/page, keep page numbers.
- **Embeddings:** pretrained multilingual model (e.g. multilingual-e5 or bge-m3). No fine-tuning.
- **LLM:** Claude API for structured extraction (requirements, spec-language checks). Cache results for demo tenders.
- **Frontend:** React or Streamlit (decision: `<FILL IN>`). Built against mock data from `schemas.py` first.
- **Infra:** docker-compose with Postgres/pgvector for identical dev environments.

## Planned API endpoints
- `POST /profile`: create/update company profile
- `GET /search?q=&profile_id=`: semantic search with fit scores and match snippets
- `GET /tenders/{id}/analysis`: fit, red-flag indicators (with evidence), eligibility checklist (with citations), win-chance estimate
- `GET /buyers/{id}/profile`: buyer history, single-bidder rate, repeat winners
Exact response shapes are defined in `schemas.py` (source of truth).

## Conventions
- Python 3.11+, type hints, Pydantic models for all API I/O.
- Red-flag rules are pure functions: input tender/buyer data, output `{indicator, triggered, evidence}`.
- LLM calls: request JSON matching a schema, validate with Pydantic, retry once on invalid output, cache by (tender_id, prompt_version).
- Config via `.env` (see `.env.example`). Never commit keys.
- Small commits, branch per person, merge to `main` often.

## Team roles (fill in names)
- A: Data & ingestion
- B: Search, fit score, win-chance
- C: LLM analysis (eligibility, red flags)
- D: Frontend, demo, pitch

## Demo scenario
A small company (fictional profile: `<FILL IN>`) enters its profile, gets ranked tenders including one a keyword search would have missed (cross-language or misclassified CPV), opens a tender flagged with several risk indicators, and sees the eligibility checklist with page citations. Results for the demo tenders are pre-computed and a fallback recording exists.

## Priorities if time runs out
Semantic search, then red flags, then eligibility checker, then win-chance. Anything not working at feature freeze is presented as roadmap.

## Open questions
- Which tender types/procedures are in scope for the demo?
- Which fields from the OCDS API are reliably populated (bids, awards, document links)?
- Language of the UI at demo time.
- Frontend framework decision.