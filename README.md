# Moldova Tender Copilot

AI assistant for Moldovan public procurement (MTender/OCDS).

## Quick start — backend only

```bash
cp .env.example .env
# Fill in DEEPSEEK_API_KEY

docker compose up -d db           # start Postgres + pgvector
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head              # create schema (or: python -m scripts.init_db)
uvicorn app.main:app --reload     # → http://localhost:8000/docs
```

> Schema changes after a database already exists need a new Alembic migration or a
> fresh volume (`docker compose down -v`). `create_all` never alters existing tables.

## Quick start — full Docker (backend and database)

```bash
cp .env.example .env
docker compose up --build
```

## Project structure

```
ninefive/
├── docker-compose.yml
├── .env.example
├── README.md
├── frontend/
│   ├── README.md             ← how to run, team rules, who owns what
│   └── src/
│       ├── api/
│       │   ├── types.ts      ← API contract the backend implements
│       │   └── *.ts          ← fetch functions and data hooks per area
│       ├── mocks/            ← mock API (MSW) and fictional data
│       ├── features/         ← one folder per area: profile, board, tender, analyzer, integrity
│       ├── components/       ← layout, shared components, shadcn/ui
│       └── i18n/             ← Romanian, English and Russian text
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── alembic.ini
    ├── alembic/
    │   ├── env.py            ← async-compatible migration runner
    │   ├── script.py.mako
    │   └── versions/         ← generated migration files go here
    └── app/
        ├── main.py           ← FastAPI app + router registration
        ├── schemas.py        ← Pydantic models, to be updated to match the frontend contract
        ├── core/
        │   ├── config.py     ← settings from .env (pydantic-settings)
        │   ├── database.py   ← async SQLAlchemy engine + Base + get_db
        │   └── llm.py        ← shared DeepSeek client
        ├── api/              ← route handlers (stubs — one branch per feature)
        │   ├── profile.py
        │   ├── search.py
        │   ├── tenders.py
        │   └── buyers.py
        └── models/           ← SQLAlchemy ORM models
            └── tender.py
```

## Branches

Frontend:

| Branch | Owner | Scope |
|---|---|---|
| `feat/frontend-profile` | 1 | Setup, API contract, company profile |
| `feat/frontend-board` | 2 | Tender board, filters |
| `feat/frontend-tender` | 3 | Tender detail page, eligibility, win chance |
| `feat/frontend-analyzer` | 4 | Competitor analyzer |
| `feat/frontend-integrity` | 5 | Integrity signals, buyer page, demo |

Backend:

| Branch | Owner | Scope |
|---|---|---|
| `feat/ingestion` | A | OCDS pull script, full DB schema, Alembic migrations |
| `feat/search` | B | pgvector search, fit score, win-chance |
| `feat/llm-analysis` | C | Eligibility checker, red-flag rules, DeepSeek calls |

## API endpoints

Request and response shapes are in `frontend/src/api/types.ts`.

- **mock**: the frontend's mock API answers it; the backend doesn't have it yet.
- **stub**: the backend route exists but isn't implemented.

| Method | Path | Status |
|---|---|---|
| `GET` | `/health` | ✅ live |
| `POST` | `/profile` | mock, backend stub |
| `GET` | `/profile/{id}` | mock |
| `PATCH` | `/profile/{id}` | mock |
| `GET` | `/profile/lookup?idno=` | mock |
| `GET` | `/profile/{id}/pricelists` | mock |
| `POST` | `/profile/{id}/pricelists` | mock |
| `DELETE` | `/profile/{id}/pricelists/{pricelist_id}` | mock |
| `GET` | `/profile/{id}/catalogue` | mock |
| `PATCH` | `/profile/{id}/catalogue/{item_id}` | mock |
| `DELETE` | `/profile/{id}/catalogue/{item_id}` | mock |
| `GET` | `/board?profile_id=` | mock |
| `PATCH` | `/board/{tender_id}?profile_id=` | mock |
| `GET` | `/tenders/{id}?profile_id=` | mock |
| `GET` | `/tenders/{id}/analysis?profile_id=` | mock, backend stub |
| `GET` | `/tenders/{id}/competitors` | mock |
| `GET` | `/buyers/{id}/profile` | mock, backend stub |
| `GET` | `/search?q=` | backend stub; the frontend searches through `/board?q=` instead |


Help Moldovan businesses find public tenders worth bidding on and buyers compare submitted offers.

Tender notices and attached documents take time to read. ninefive aims to bring relevant opportunities, requirements, and supporting evidence into one place so companies can decide whether to bid.

## Planned features

- Search tenders in Romanian and Russian by meaning, with keyword and CPV filters.
- Support fuzzy search for typos and partial matches.
- Filter by publication, modification, and tender start dates, value, location, and tags. More filters TBD.
- Sort by relevance, price, date, and eligibility.
- Match opportunities against a company's goods, services, and capacity.
- Help companies prepare joint bids when different suppliers cover different parts of a request.
- Extract requirements into an eligibility checklist. Show what matches, what doesn't, and what's unknown.
- Show sellers how many requirements they meet. Estimate chances of winning once enough historical data supports it.
- Flag restrictive specifications and patterns of possible favoritism, with links to evidence for review.
- Let buyers sort submitted offers by their evaluation criteria.

Public procurement data comes from Moldova's MTender system. Findings should link back to source records or documents.

## Backend runbook

```bash
# from backend/
alembic upgrade head              # create/upgrade schema
python -m scripts.ingest          # sample tenders + demo profile & catalogue
python -m scripts.fetch_mtender   # live OCDS ingest (optional)
python -m scripts.fetch_docs      # download + extract documents
python -m scripts.embed_chunks    # chunk + tender embeddings
python -m scripts.precompute      # warm DeepSeek caches (needs DEEPSEEK_API_KEY)
pytest -q                         # backend test suite
```

Secrets live in `.env` (repo root, for docker-compose) and `backend/.env` (for a
local `uvicorn` run). Both are gitignored. Copy from `.env.example`.
