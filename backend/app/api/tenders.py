from fastapi import APIRouter

from app.schemas import TenderAnalysis

router = APIRouter()


@router.get("/{tender_id}/analysis", response_model=TenderAnalysis)
async def get_tender_analysis(
    tender_id: str,
    profile_id: int | None = None,
) -> TenderAnalysis:
    # TODO (feat/llm-analysis): fit score + red flags + eligibility + win-chance
    raise NotImplementedError
