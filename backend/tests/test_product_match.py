from app.models.catalogue import CatalogueItem
from app.models.tender_item import TenderItem
from app.schemas import Citation
from app.services.product_match import match_tender_items


def _citation() -> Citation:
    return Citation(document_id="ocds-1", document_title="Anunț", url="http://x")


def test_matches_tender_item_to_catalogue():
    item = TenderItem(id=1, tender_id=1, description="Laptop Dell Latitude")
    catalogue = [
        CatalogueItem(
            id=7,
            pricelist_id=1,
            name="Laptop Dell Latitude 5540",
            description="",
            price={"amount": 12000.0, "currency": "MDL"},
        )
    ]

    matches = match_tender_items([item], catalogue, _citation())

    assert len(matches) == 1
    assert matches[0].catalogue_item is not None
    assert matches[0].catalogue_item.item_id == 7
    assert matches[0].tender_item.citations[0].document_id == "ocds-1"


def test_unmatched_item_returns_none_catalogue():
    item = TenderItem(id=1, tender_id=1, description="Ciment Portland")
    catalogue = [
        CatalogueItem(
            id=7,
            pricelist_id=1,
            name="Laptop",
            description="",
            price={"amount": 1.0, "currency": "MDL"},
        )
    ]

    matches = match_tender_items([item], catalogue, _citation())

    assert matches[0].catalogue_item is None
