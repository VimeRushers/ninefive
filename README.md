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
