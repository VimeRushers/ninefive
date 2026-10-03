"""Pure-Python schema validation tests. No DB or network required."""
import pytest
from pydantic import ValidationError

from app.schemas import (
    BuyerProfile,
    EligibilityChecklist,
    EligibilityItem,
    MoneyAmount,
    ProfileCreate,
    RedFlag,
    SearchResult,
    TenderAnalysis,
    WinChanceEstimate,
)


def test_money_amount_defaults_to_mdl():
    assert MoneyAmount(amount=1000).currency == "MDL"


def test_money_amount_custom_currency():
    assert MoneyAmount(amount=500, currency="EUR").currency == "EUR"


def test_profile_create_minimal():
    p = ProfileCreate(name="Acme SRL", description="IT services")
    assert p.idno is None
    assert p.cpv_codes == []


def test_profile_create_requires_name():
    with pytest.raises(ValidationError):
        ProfileCreate(description="no name")


def test_profile_create_requires_description():
    with pytest.raises(ValidationError):
        ProfileCreate(name="Acme SRL")


def test_search_result_fit_score_bounds():
    base = dict(
        tender_id="t1", title="T", buyer_name="B",
        estimated_value=None, deadline=None, match_snippet="x",
    )
    SearchResult(**base, fit_score=0.0)
    SearchResult(**base, fit_score=1.0)
    with pytest.raises(ValidationError):
        SearchResult(**base, fit_score=1.1)
    with pytest.raises(ValidationError):
        SearchResult(**base, fit_score=-0.1)


def test_search_result_default_red_flag_count():
    r = SearchResult(
        tender_id="t1", title="T", buyer_name="B",
        estimated_value=None, deadline=None, fit_score=0.5, match_snippet="x",
    )
    assert r.red_flag_count == 0


def test_red_flag_defaults():
    rf = RedFlag(indicator="short_window", triggered=False)
    assert rf.evidence == []


def test_eligibility_checklist_disclaimer():
    item = EligibilityItem(
        requirement="Turnover >= 1M MDL",
        requirement_type="financial",
        threshold="1000000 MDL",
        source_page=3,
    )
    cl = EligibilityChecklist(
        tender_id="t1", profile_id=None,
        items=[item], met_count=0, total_count=1,
    )
    assert "not legal advice" in cl.disclaimer
    assert cl.items[0].met is None


def test_win_chance_probability_bounds():
    base = dict(tender_id="t1", typical_bidder_count=4.0)
    WinChanceEstimate(**base, estimated_probability=0.0)
    WinChanceEstimate(**base, estimated_probability=None)
    with pytest.raises(ValidationError):
        WinChanceEstimate(**base, estimated_probability=1.5)


def test_win_chance_disclaimer():
    w = WinChanceEstimate(tender_id="t1", typical_bidder_count=None)
    assert "historical patterns" in w.disclaimer


def test_tender_analysis_minimal():
    ta = TenderAnalysis(
        tender_id="t1", fit_score=None,
        red_flags=[], eligibility=None, win_chance=None,
    )
    assert ta.red_flags == []


def test_buyer_profile_rate_bounds():
    base = dict(buyer_id="b1", name="Ministry", total_tenders=50)
    BuyerProfile(**base, single_bidder_rate=0.0)
    with pytest.raises(ValidationError):
        BuyerProfile(**base, single_bidder_rate=1.1)


def test_buyer_profile_top_winners_default():
    b = BuyerProfile(buyer_id="b1", name="Ministry", total_tenders=10)
    assert b.top_winners == []
