from app.models.profile import CompanyProfile
from app.models.tender import Tender
from app.services.eligibility import board_eligibility


def _tender() -> Tender:
    tender = Tender(id=1, ocds_id="ocds-1", title="T", estimated_amount=100000.0)
    tender.documents = []
    return tender


def test_board_eligibility_flags_unmet_requirement():
    profile = CompanyProfile(
        id=1,
        name="Co",
        description="d",
        annual_turnover={"amount": 1000.0, "currency": "MDL"},
        certifications=["ISO"],
    )

    summary, reasons = board_eligibility(_tender(), profile)

    assert summary.total_count == 3
    assert summary.met_count == 2
    assert len(reasons) == 1


def test_board_eligibility_without_profile_is_unknown():
    summary, reasons = board_eligibility(_tender(), None)

    assert summary.unknown_count == 3
    assert reasons == []
