from app.models.award import Award
from app.models.tender import Tender
from app.services.win_chance import estimate_win_chance


def _tender() -> Tender:
    return Tender(id=1, ocds_id="ocds-1", title="Tender")


def _award(name: str) -> Award:
    return Award(tender_id=1, supplier_name=name)


def test_no_history_returns_no_estimate():
    estimate = estimate_win_chance(_tender(), [])

    assert estimate.estimated_probability is None
    assert estimate.buyer_concentration is None


def test_concentrated_buyer_lowers_probability():
    awards = [_award("A"), _award("A"), _award("A"), _award("B")]

    estimate = estimate_win_chance(_tender(), awards)

    assert estimate.buyer_concentration == 0.75
    assert estimate.estimated_probability == 0.25


def test_diverse_buyer_raises_probability():
    awards = [_award("A"), _award("B"), _award("C"), _award("D")]

    estimate = estimate_win_chance(_tender(), awards)

    assert estimate.buyer_concentration == 0.25
    assert estimate.estimated_probability == 0.5
