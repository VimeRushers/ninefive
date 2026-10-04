# ninefive

Moldova Tender Copilot. Find public tenders that fit your company and check whether they are worth bidding on.

Tender titles and CPV codes rarely tell the whole story. Requirements sit in attached documents, notices appear in Romanian or Russian, and a relevant opportunity can be easy to miss. ninefive brings the tender, your company's catalogue, and the evidence behind each assessment into one workspace.

Built for a Moldova hackathon, using public procurement data from [MTender](https://mtender.gov.md/) in the Open Contracting Data Standard format. The app has a self-contained browser demo and a FastAPI backend with ingestion and analysis tools. It is a prototype, with the remaining work listed below.

## What you can do

- Search tenders by meaning across Romanian and Russian, with filters for CPV, value, region, dates, and eligibility.
- Keep opportunities on a board, move them between stages, and review changes to a tender.
- Set up a company profile, upload price lists, and compare catalogue items with requested products.
- Read an eligibility checklist alongside document citations. Missing evidence stays unknown.
- Review integrity signals such as short submission windows, restrictive specifications, repeated winners, and CPV mismatches.
- Inspect published award data and available bidder documents to understand past results.

The interface supports Romanian, English, and Russian, with Romanian as the default. Light and dark themes are available.

Integrity signals are prompts for review, not accusations. Eligibility checks help prepare a bid; they are not legal advice. Competition estimates use historical awards, never private bids before opening. AI-derived findings should include source documents and page references so a person can check them.

## Try the demo

Install Node.js compatible with Vite 8, then run:

```bash
cd frontend
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173). No backend or API key is needed. Mock Service Worker intercepts API requests and serves bundled fictional data.

Try searching for `calculatoare`, open a tender, and follow its eligibility and integrity tabs. The [demo script](frontend/DEMO.md) walks through the full scenario.

In this mode, edits reset on reload, document links open a placeholder, and analysis scores are examples. The demo illustrates the workflow; it does not measure search or prediction quality.

To record a fallback video:

```bash
# From frontend/
npx playwright install chromium
npm run demo:record
```

The recording is saved to `frontend/demo-recording/ninefive-demo.webm`.

## Run the backend locally

You need Python 3.11+ and Docker for PostgreSQL with pgvector. From the repository root:

```bash
cp .env.example .env
cp .env.example backend/.env
docker compose up -d db

cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m scripts.ingest
uvicorn app.main:app --reload
```

The API runs at [localhost:8000](http://localhost:8000), with interactive documentation at [/docs](http://localhost:8000/docs). The seed script adds sample tenders, awards, and a demo company with a catalogue. These are fixtures, not verified procurement records.

Local commands read `backend/.env`. The example database URL uses `localhost`, which is correct when Python runs on your machine. Set `DEEPSEEK_API_KEY` there to enable LLM analysis. The browser demo does not use it.

### Enable semantic search and document extraction

The core requirements do not install the embedding model or PDF tools. Install the optional dependencies before preparing real search data:

```bash
# From backend/, with the virtual environment active
pip install -r requirements-ml.txt
python -m scripts.embed_chunks
```

The default model is `intfloat/multilingual-e5-large`; its first load may download model weights. Set `EMBED_ALLOW_FALLBACK=false` in `backend/.env` to fail if the model cannot load. Development fallback vectors are deterministic hashes and do not provide semantic search.

Scanned PDFs also need Tesseract installed on the host, with Romanian and Russian language data, `ron` and `rus`.

### Connect the frontend

Create `frontend/.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
VITE_API_MOCKS=false
```

Restart the Vite dev server. The app now uses the backend database instead of browser fixtures. The two datasets are separate, so the live view will differ from the demo.

### Run the API in Docker

Copy `.env.example` to `.env` if needed. In the root `.env`, change the database URL to use the Compose service name:

```dotenv
DATABASE_URL=postgresql+asyncpg://tender:tender@db:5432/tender_db
```

Then run from the repository root:

```bash
docker compose up -d --build
docker compose exec api alembic upgrade head
docker compose exec api python -m scripts.ingest
```

Compose starts the API and database. Run the frontend separately. The API image includes the optional ML and OCR dependencies by default.

Use `alembic upgrade head` for schema updates. `scripts.init_db` creates missing tables but does not update existing ones. Avoid deleting the database volume unless you intend to erase its data.

## Prepare procurement data

The ingestion script reads the public API at `https://public.mtender.gov.md`. Run these commands from `backend/`, with the database running and optional dependencies installed:

```bash
python -m scripts.fetch_mtender --limit 200
python -m scripts.fetch_docs
python -m scripts.embed_chunks
python -m scripts.precompute
```

This imports notices, downloads linked documents, extracts text, embeds tenders and document chunks, and warms analysis caches. `precompute` needs a valid DeepSeek key for the LLM cache step. To fetch older records, pass a start date, for example `--start 2024-01-01`, to `fetch_mtender`.

Live ingestion needs network access. For a presentation, prepare the dataset and caches beforehand or use the browser demo.

## Current limits and unfinished work

- The default frontend runs on mocks. Cross-language matches, citations, scores, and competitor explanations in that demo are fixtures.
- IDNO lookup uses a small bundled registry. A live company-registry integration is not connected, even where demo text names data2b.md.
- MTender ingestion runs on demand. Automatic 30-minute synchronization described in the demo is not scheduled by this repository.
- Win chance is an unvalidated heuristic based on supplier concentration. Typical bidder count and winning-price ratio still use fixed values. It needs real historical statistics and back-testing before its percentages can support decisions.
- Document processing is centered on PDFs. OCR depends on local tools, and reliable extraction from every linked format remains unfinished.
- Analysis depends on the documents and history actually imported. Missing pages, failed extraction, or incomplete award data can leave checks unanswered.
- Joint-bid preparation and buyer-side offer ranking remain planned work.
- Production deployment still needs authentication, access controls, and a restricted CORS configuration.

## How it works

The React frontend calls the API, or MSW in demo mode. FastAPI stores profiles and procurement records in PostgreSQL. pgvector compares multilingual embeddings for retrieval and fit scoring. Rule-based checks produce integrity signals; DeepSeek extracts and summarizes document content, with cached results for repeat visits.

| Location | Purpose |
| --- | --- |
| `frontend/src/features/` | Profile, board, tender details, competitor analysis, and integrity views |
| `frontend/src/api/types.ts` | Frontend request and response contract |
| `frontend/src/mocks/` | Browser demo handlers and fictional data |
| `frontend/src/i18n/` | Romanian, English, and Russian translations |
| `backend/app/api/` | FastAPI routes |
| `backend/app/schemas.py` | Pydantic API models |
| `backend/app/services/` | Retrieval, eligibility, integrity rules, product matching, and analysis |
| `backend/app/models/` | SQLAlchemy database models |
| `backend/scripts/` | Ingestion, document processing, embeddings, and cache preparation |
| `backend/alembic/` | Database migrations |

API routes cover `/profile`, `/board`, `/search`, `/tenders`, and `/buyers`. Use [/docs](http://localhost:8000/docs) for exact endpoints and parameters. Keep `frontend/src/api/types.ts` and `backend/app/schemas.py` aligned when changing the contract.

## Development checks

```bash
# From frontend/
npm run check
npm run build
```

```bash
# From backend/, with the virtual environment active
pytest -q
```

Frontend checks cover types, lint, formatting, and tests. See [frontend/README.md](frontend/README.md) for component conventions and translation rules.

Keep API keys in `.env` files, which are gitignored. Commit changes to `.env.example` when configuration changes, without real credentials.
