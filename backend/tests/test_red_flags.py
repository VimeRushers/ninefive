from datetime import datetime, timedelta, timezone

import pytest
from app.models.award import Award
from app.models.buyer import Buyer
from app.models.tender import Tender
from app.services.red_flags import (
    check_brand_names,
    check_cpv_mismatch,
    check_repeat_winner,
    check_short_deadline,
    check_single_bidder_buyer,
    evaluate_all_red_flags,
)


def test_short_deadline_triggered():
    now = datetime(2026, 10, 1, 10, 0, tzinfo=timezone.utc)
    t = Tender(
        id=1,
        published_at=now,
        submission_deadline=now + timedelta(days=4),
    )
    flag = check_short_deadline(t)
    assert flag.triggered is True
    assert flag.indicator == "short_submission_window"
    assert len(flag.evidence) > 0


def test_short_deadline_not_triggered():
    now = datetime(2026, 10, 1, 10, 0, tzinfo=timezone.utc)
    t = Tender(
        id=1,
        published_at=now,
        submission_deadline=now + timedelta(days=15),
    )
    flag = check_short_deadline(t)
    assert flag.triggered is False
    assert flag.indicator == "short_submission_window"


def test_single_bidder_buyer_triggered():
    buyer = Buyer(id=1, name="Primaria Test")
    awards = [
        Award(tender_id=1, supplier_name="Furnizor A"),
        Award(tender_id=2, supplier_name="Furnizor B"),
        Award(tender_id=3, supplier_name="Furnizor C"),
    ]
    # 3 tenders with 1 award each => 100% single bidder rate
    flag = check_single_bidder_buyer(buyer, awards, threshold=0.8)
    assert flag.triggered is True
    assert flag.indicator == "single_bidder_history"
    assert "3 din 3" in flag.evidence[0].text


def test_single_bidder_buyer_not_triggered():
    buyer = Buyer(id=1, name="Primaria Test")
    awards = [
        Award(tender_id=1, supplier_name="Furnizor A"),
        Award(tender_id=1, supplier_name="Furnizor B"),
        Award(tender_id=2, supplier_name="Furnizor C"),
        Award(tender_id=2, supplier_name="Furnizor D"),
    ]
    # 2 tenders with 2 awards each => 0% single bidder rate
    flag = check_single_bidder_buyer(buyer, awards, threshold=0.8)
    assert flag.triggered is False


def test_repeat_winner_triggered():
    awards = [
        Award(tender_id=1, supplier_name="MegaCorp SRL"),
        Award(tender_id=2, supplier_name="MegaCorp SRL"),
        Award(tender_id=3, supplier_name="MegaCorp SRL"),
        Award(tender_id=4, supplier_name="Other SRL"),
    ]
    # 3 out of 4 (75% > 50%)
    flag = check_repeat_winner(awards, threshold=0.5)
    assert flag.triggered is True
    assert flag.indicator == "repeat_winner"
    assert "MegaCorp SRL" in flag.evidence[0].text


def test_repeat_winner_not_triggered():
    awards = [
        Award(tender_id=1, supplier_name="Corp A"),
        Award(tender_id=2, supplier_name="Corp B"),
        Award(tender_id=3, supplier_name="Corp C"),
        Award(tender_id=4, supplier_name="Corp D"),
    ]
    flag = check_repeat_winner(awards, threshold=0.5)
    assert flag.triggered is False


def test_brand_names_without_equivalent():
    text = "Achiziționare server Dell PowerEdge R740 pentru primărie."
    flag = check_brand_names(text)
    assert flag.triggered is True
    assert flag.indicator == "brand_without_equivalent"


def test_brand_names_with_equivalent():
    text = (
        "Server Dell PowerEdge R740 sau echivalent tehnic conform caietului de sarcini."
    )
    flag = check_brand_names(text)
    assert flag.triggered is False


def test_cpv_mismatch():
    flag = check_cpv_mismatch(
        tender_title="Lucrări de asfaltare drum",
        cpv_labels=["Servicii software"],
        similarity_score=0.15,
        threshold=0.35,
    )
    assert flag.triggered is True
    assert flag.indicator == "cpv_mismatch"


def test_evaluate_all_red_flags():
    now = datetime(2026, 10, 1, 10, 0, tzinfo=timezone.utc)
    tender = Tender(
        id=1,
        title="Laptopuri de birou",
        description="Laptop Dell Inspiron 15",
        published_at=now,
        submission_deadline=now + timedelta(days=3),
    )
    flags = evaluate_all_red_flags(tender)
    assert len(flags) >= 3
    triggered_indicators = [f.indicator for f in flags if f.triggered]
    assert "short_submission_window" in triggered_indicators
    assert "brand_without_equivalent" in triggered_indicators
