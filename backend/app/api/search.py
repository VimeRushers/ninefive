from fastapi import APIRouter, Query

from app.schemas import SearchResponse

router = APIRouter()


@router.get("", response_model=SearchResponse)
async def search_tenders(
    q: str = Query(..., description="Search query — Romanian, Russian, or English"),
    profile_id: int | None = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
) -> SearchResponse:
    # TODO (feat/search): embed query, cosine-search pgvector, score with profile fit
    raise NotImplementedError
