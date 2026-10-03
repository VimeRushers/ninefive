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
alembic upgrade head              # run DB migrations
uvicorn app.main:app --reload     # → http://localhost:8000/docs
```

## Quick start — full Docker

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
        ├── schemas.py        ← Pydantic models (source of truth for all I/O)
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

| Branch | Owner | Scope |
|---|---|---|
| `feat/ingestion` | A | OCDS pull script, full DB schema, Alembic migrations |
| `feat/search` | B | pgvector search, fit score, win-chance |
| `feat/llm-analysis` | C | Eligibility checker, red-flag rules, DeepSeek calls |
| `feat/frontend` | D | React/Streamlit UI, demo scenario |

Merge to `main` often. `schemas.py` is the shared contract — coordinate before changing it.

## API endpoints

| Method | Path | Status |
|---|---|---|
| `GET` | `/health` | ✅ live |
| `POST` | `/profile` | stub |
| `GET` | `/search?q=` | stub |
| `GET` | `/tenders/{id}/analysis` | stub |
| `GET` | `/buyers/{id}/profile` | stub |


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
