from fastapi import APIRouter

from app.schemas import BuyerProfile

router = APIRouter()


@router.get("/{buyer_id}/profile", response_model=BuyerProfile)
async def get_buyer_profile(buyer_id: str) -> BuyerProfile:
    # TODO (feat/search): aggregate buyer history from DB
    raise NotImplementedError
