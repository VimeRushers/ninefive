"""Contract guard: the API must expose every route and field the frontend expects.

If one of these fails, the frontend and backend have drifted.
"""

from app.main import app
from app.schemas import (
    BoardCard,
    BoardResponse,
    CatalogueItem,
    CompanyLookup,
    CompetitorAnalysis,
    EligibilityChecklist,
    Pricelist,
    RedFlag,
    SearchResponse,
    TenderDetail,
)

EXPECTED_ROUTES = [
    ("GET", "/health"),
    ("GET", "/profile/lookup"),
    ("POST", "/profile"),
    ("GET", "/profile/{profile_id}"),
    ("PATCH", "/profile/{profile_id}"),
    ("GET", "/profile/{profile_id}/pricelists"),
    ("POST", "/profile/{profile_id}/pricelists"),
    ("DELETE", "/profile/{profile_id}/pricelists/{pricelist_id}"),
    ("GET", "/profile/{profile_id}/catalogue"),
    ("PATCH", "/profile/{profile_id}/catalogue/{item_id}"),
    ("DELETE", "/profile/{profile_id}/catalogue/{item_id}"),
    ("GET", "/board"),
    ("PATCH", "/board/{tender_id}"),
    ("GET", "/tenders/{tender_id}"),
    ("GET", "/tenders/{tender_id}/analysis"),
    ("GET", "/tenders/{tender_id}/competitors"),
    ("GET", "/buyers/{buyer_id}/profile"),
]


def _registered() -> set[tuple[str, str]]:
    paths = app.openapi()["paths"]
    return {
        (method.upper(), path)
        for path, operations in paths.items()
        for method in operations
    }


def test_all_frontend_routes_registered():
    found = _registered()
    missing = [pair for pair in EXPECTED_ROUTES if pair not in found]
    assert not missing, f"Missing routes: {missing}"


def _assert_fields(model, required):
    missing = required - set(model.model_fields)
    assert not missing, f"{model.__name__} missing fields: {missing}"


def test_board_card_fields():
    _assert_fields(
        BoardCard,
        {
            "tender_id",
            "stage",
            "stage_source",
            "stage_reason",
            "questionable_reasons",
            "eligibility",
            "win_probability",
            "tags",
            "red_flag_count",
            "changed_in_last_sync",
            "estimated_value",
            "deadline",
            "published_at",
        },
    )


def test_tender_detail_fields():
    _assert_fields(
        TenderDetail,
        {"tender_id", "summary", "product_matches", "changes", "documents", "tags"},
    )


def test_eligibility_and_redflag_fields():
    _assert_fields(EligibilityChecklist, {"items", "met_count", "total_count"})
    _assert_fields(RedFlag, {"indicator", "triggered", "evidence"})


def test_profile_and_catalogue_fields():
    _assert_fields(
        CompanyLookup, {"idno", "name", "region", "activities", "source"}
    )
    _assert_fields(Pricelist, {"id", "file_name", "uploaded_at", "status", "item_count"})
    _assert_fields(
        CatalogueItem, {"id", "pricelist_id", "name", "description", "price"}
    )


def test_response_envelopes():
    _assert_fields(BoardResponse, {"profile_id", "cards", "last_sync_at"})
    _assert_fields(SearchResponse, {"query", "profile_id", "results", "total"})
    _assert_fields(
        CompetitorAnalysis,
        {"tender_id", "state", "analyzed_at", "participants", "lessons"},
    )
