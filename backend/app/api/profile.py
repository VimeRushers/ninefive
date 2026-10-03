from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas import ProfileCreate, ProfileOut

router = APIRouter()


@router.post("", response_model=ProfileOut, status_code=201)
async def create_profile(
    payload: ProfileCreate,
    db: AsyncSession = Depends(get_db),
) -> ProfileOut:
    # TODO (feat/ingestion): persist to DB, return saved record
    raise NotImplementedError
