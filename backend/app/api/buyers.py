from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.award import Award
from app.models.buyer import Buyer
from app.models.tender import Tender
from app.schemas import BuyerProfile, MoneyAmount, TopWinner

router = APIRouter()


@router.get("/{buyer_id}/profile", response_model=BuyerProfile)
async def get_buyer_profile(
    buyer_id: str,
    db: AsyncSession = Depends(get_db),
) -> BuyerProfile:
    # buyer_id can be string id or ocds_id
    stmt = (
        select(Buyer)
        .where(
            (Buyer.ocds_id == buyer_id)
            | (Buyer.id == int(buyer_id) if buyer_id.isdigit() else False)
        )
        .options(selectinload(Buyer.tenders).selectinload(Tender.awards))
    )
    res = await db.execute(stmt)
    buyer = res.scalar_one_or_none()

    if not buyer:
        # Check if any tender has this buyer_ocds_id
        tenders_stmt = (
            select(Tender)
            .where((Tender.buyer_ocds_id == buyer_id) | (Tender.buyer_name == buyer_id))
            .options(selectinload(Tender.awards))
        )
        t_res = await db.execute(tenders_stmt)
        tenders = list(t_res.scalars().all())
        buyer_name = (
            tenders[0].buyer_name if tenders and tenders[0].buyer_name else buyer_id
        )
    else:
        tenders = buyer.tenders
        buyer_name = buyer.name

    total_tenders = len(tenders)
    if total_tenders == 0:
        return BuyerProfile(
            buyer_id=buyer_id,
            name=buyer_name or buyer_id,
            total_tenders=0,
            single_bidder_rate=None,
            repeat_winner_concentration=None,
            top_winners=[],
        )

    # Gather all awards across tenders
    all_awards: list[Award] = []
    tenders_with_single_award = 0

    for t in tenders:
        t_awards = t.awards or []
        all_awards.extend(t_awards)
        if len(t_awards) == 1:
            tenders_with_single_award += 1

    single_bidder_rate = (
        tenders_with_single_award / total_tenders if total_tenders > 0 else None
    )

    # Aggregate awards by supplier
    supplier_awards: dict[str, list[Award]] = defaultdict(list)
    for a in all_awards:
        if a.supplier_name:
            supplier_awards[a.supplier_name].append(a)

    total_awards_count = len(all_awards)
    top_winners: list[TopWinner] = []

    if total_awards_count > 0 and supplier_awards:
        sorted_suppliers = sorted(
            supplier_awards.items(),
            key=lambda item: len(item[1]),
            reverse=True,
        )

        max_supplier_count = len(sorted_suppliers[0][1])
        repeat_winner_concentration = max_supplier_count / total_awards_count

        for name, a_list in sorted_suppliers[:5]:
            val = sum(a.value or 0.0 for a in a_list)
            top_winners.append(
                TopWinner(
                    name=name,
                    idno=a_list[0].supplier_idno if a_list else None,
                    contracts_won=len(a_list),
                    total_value=MoneyAmount(amount=val, currency="MDL"),
                    share=len(a_list) / total_awards_count,
                )
            )
    else:
        repeat_winner_concentration = None

    return BuyerProfile(
        buyer_id=buyer_id,
        name=buyer_name or buyer_id,
        total_tenders=total_tenders,
        single_bidder_rate=single_bidder_rate,
        repeat_winner_concentration=repeat_winner_concentration,
        top_winners=top_winners,
    )
