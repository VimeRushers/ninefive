"""Match tender line items to a company's catalogue (no LLM)."""

from __future__ import annotations

from difflib import SequenceMatcher

from app.models.catalogue import CatalogueItem
from app.models.tender_item import TenderItem
from app.schemas import (
    CatalogueMatchCandidate,
    Citation,
    CitedText,
    MoneyAmount,
    ProductMatch,
)

MATCH_THRESHOLD = 0.35


def _similarity(left: str, right: str) -> float:
    a = " ".join(left.casefold().split())
    b = " ".join(right.casefold().split())
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def _price(item: CatalogueItem) -> MoneyAmount:
    if isinstance(item.price, dict):
        return MoneyAmount(
            amount=float(item.price.get("amount", 0.0)),
            currency=item.price.get("currency", "MDL"),
        )
    return MoneyAmount(amount=0.0, currency="MDL")


def match_tender_items(
    items: list[TenderItem],
    catalogue: list[CatalogueItem],
    citation: Citation,
) -> list[ProductMatch]:
    matches: list[ProductMatch] = []
    for item in items:
        best_item: CatalogueItem | None = None
        best_score = 0.0
        for candidate in catalogue:
            score = _similarity(item.description, candidate.name)
            if score > best_score:
                best_score = score
                best_item = candidate

        catalogue_match = None
        if best_item is not None and best_score >= MATCH_THRESHOLD:
            catalogue_match = CatalogueMatchCandidate(
                item_id=best_item.id,
                name=best_item.name,
                price=_price(best_item),
                similarity=max(0.0, min(1.0, best_score)),
            )

        matches.append(
            ProductMatch(
                tender_item=CitedText(text=item.description, citations=[citation]),
                catalogue_item=catalogue_match,
                estimated_unit_price=None,
            )
        )
    return matches
