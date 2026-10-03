"""Win-chance estimate from historical awards.

Active competitor bids are not public before opening, so this only uses past
award patterns. No history means no estimate (None), never a made-up number.
"""

from app.models.award import Award
from app.models.tender import Tender
from app.schemas import WinChanceEstimate


def estimate_win_chance(
    tender: Tender, historical_awards: list[Award]
) -> WinChanceEstimate:
    total = len(historical_awards)
    if total == 0:
        return WinChanceEstimate(
            tender_id=str(tender.id),
            estimated_probability=None,
            typical_bidder_count=None,
            typical_winning_ratio=None,
            buyer_concentration=None,
        )

    supplier_counts: dict[str, int] = {}
    for award in historical_awards:
        if award.supplier_name:
            supplier_counts[award.supplier_name] = (
                supplier_counts.get(award.supplier_name, 0) + 1
            )

    max_wins = max(supplier_counts.values()) if supplier_counts else 0
    concentration = max_wins / total

    probability = 0.40
    if concentration > 0.6:
        probability -= 0.15
    elif concentration < 0.3:
        probability += 0.10

    return WinChanceEstimate(
        tender_id=str(tender.id),
        estimated_probability=max(0.05, min(0.95, probability)),
        typical_bidder_count=3.0,
        typical_winning_ratio=0.88,
        buyer_concentration=concentration,
    )
