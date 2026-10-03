from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import buyers, profile, search, tenders
from app.core.config import settings

app = FastAPI(
    title="Moldova Tender Copilot",
    version="0.1.0",
    description="AI assistant for Moldovan public procurement (MTender/OCDS)",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before going to production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router, prefix="/profile", tags=["profile"])
app.include_router(search.router, prefix="/search", tags=["search"])
app.include_router(tenders.router, prefix="/tenders", tags=["tenders"])
app.include_router(buyers.router, prefix="/buyers", tags=["buyers"])


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok"}
