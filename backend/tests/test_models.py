"""
Structural tests for ORM models.
No database connection required — these test the Python-level definitions only.
"""

import app.models  # registers all models with Base.metadata
import pytest
from app.core.database import Base
from app.models import (
    Award,
    BidStatistic,
    BoardEntry,
    Buyer,
    CatalogueItem,
    Chunk,
    CompanyProfile,
    Document,
    LLMCache,
    Pricelist,
    Tender,
    TenderChange,
)
from sqlalchemy import inspect as sa_inspect

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def column_names(model) -> set[str]:
    return {c.key for c in sa_inspect(model).mapper.column_attrs}


# ---------------------------------------------------------------------------
# All models import and are registered with Base
# ---------------------------------------------------------------------------


def test_all_models_registered_with_base():
    registered = {t for t in Base.metadata.tables}
    expected = {
        "tenders",
        "buyers",
        "company_profiles",
        "awards",
        "bid_statistics",
        "documents",
        "chunks",
        "llm_cache",
        "pricelists",
        "catalogue_items",
        "board_entries",
        "tender_changes",
    }
    assert expected.issubset(registered), f"Missing tables: {expected - registered}"


# ---------------------------------------------------------------------------
# Table names
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "model,expected_table",
    [
        (Tender, "tenders"),
        (Buyer, "buyers"),
        (CompanyProfile, "company_profiles"),
        (Award, "awards"),
        (BidStatistic, "bid_statistics"),
        (Document, "documents"),
        (Chunk, "chunks"),
        (LLMCache, "llm_cache"),
        (Pricelist, "pricelists"),
        (CatalogueItem, "catalogue_items"),
        (BoardEntry, "board_entries"),
        (TenderChange, "tender_changes"),
    ],
)
def test_table_name(model, expected_table):
    assert model.__tablename__ == expected_table


# ---------------------------------------------------------------------------
# Critical columns present
# ---------------------------------------------------------------------------


def test_tender_columns():
    cols = column_names(Tender)
    required = {
        "id",
        "ocds_id",
        "title",
        "description",
        "buyer_id",
        "buyer_ocds_id",
        "buyer_name",
        "estimated_amount",
        "currency",
        "published_at",
        "submission_deadline",
        "cpv_codes",
        "region",
        "procedure_type",
        "status",
        "raw_ocds",
        "ocds_packages",
        "created_at",
        "updated_at",
    }
    assert required.issubset(cols), f"Missing Tender columns: {required - cols}"


def test_buyer_columns():
    cols = column_names(Buyer)
    required = {"id", "ocds_id", "name", "idno", "region", "created_at", "updated_at"}
    assert required.issubset(cols), f"Missing Buyer columns: {required - cols}"


def test_company_profile_columns():
    cols = column_names(CompanyProfile)
    required = {
        "id",
        "idno",
        "name",
        "description",
        "cpv_codes",
        "regions",
        "budget_min",
        "budget_max",
        "embedding",
        "created_at",
        "updated_at",
    }
    assert required.issubset(cols), f"Missing CompanyProfile columns: {required - cols}"


def test_award_columns():
    cols = column_names(Award)
    required = {
        "id",
        "ocds_id",
        "tender_id",
        "supplier_name",
        "supplier_idno",
        "supplier_ocds_id",
        "value",
        "currency",
        "date",
        "status",
        "created_at",
    }
    assert required.issubset(cols), f"Missing Award columns: {required - cols}"


def test_bid_statistic_columns():
    cols = column_names(BidStatistic)
    required = {"id", "tender_id", "measure", "value", "related_lot", "created_at"}
    assert required.issubset(cols), f"Missing BidStatistic columns: {required - cols}"


def test_document_columns():
    cols = column_names(Document)
    required = {
        "id",
        "ocds_id",
        "tender_id",
        "url",
        "title",
        "document_type",
        "language",
        "local_path",
        "processed",
        "participant_ocds_id",
        "created_at",
    }
    assert required.issubset(cols), f"Missing Document columns: {required - cols}"


def test_chunk_columns():
    cols = column_names(Chunk)
    required = {
        "id",
        "document_id",
        "tender_id",
        "page_number",
        "text",
        "embedding",
        "created_at",
    }
    assert required.issubset(cols), f"Missing Chunk columns: {required - cols}"


def test_llm_cache_columns():
    cols = column_names(LLMCache)
    required = {"id", "tender_ocds_id", "prompt_version", "result", "created_at"}
    assert required.issubset(cols), f"Missing LLMCache columns: {required - cols}"


def test_pricelist_columns():
    cols = column_names(Pricelist)
    required = {
        "id",
        "profile_id",
        "file_name",
        "status",
        "item_count",
        "uploaded_at",
    }
    assert required.issubset(cols), f"Missing Pricelist columns: {required - cols}"


def test_catalogue_item_columns():
    cols = column_names(CatalogueItem)
    required = {
        "id",
        "pricelist_id",
        "name",
        "description",
        "price",
        "created_at",
        "updated_at",
    }
    assert required.issubset(cols), f"Missing CatalogueItem columns: {required - cols}"


def test_board_entry_columns():
    cols = column_names(BoardEntry)
    required = {
        "id",
        "profile_id",
        "tender_id",
        "stage",
        "stage_source",
        "stage_reason",
        "updated_at",
    }
    assert required.issubset(cols), f"Missing BoardEntry columns: {required - cols}"


def test_tender_change_columns():
    cols = column_names(TenderChange)
    required = {
        "id",
        "tender_id",
        "synced_at",
        "changes",
        "verdict",
        "reason",
        "stage_before",
        "stage_after",
        "created_at",
    }
    assert required.issubset(cols), f"Missing TenderChange columns: {required - cols}"


# ---------------------------------------------------------------------------
# Relationships
# ---------------------------------------------------------------------------


def test_tender_relationships():
    rels = {r.key for r in sa_inspect(Tender).mapper.relationships}
    assert {"buyer", "awards", "bid_statistics", "documents", "chunks"}.issubset(rels)


def test_buyer_has_tenders_relationship():
    rels = {r.key for r in sa_inspect(Buyer).mapper.relationships}
    assert "tenders" in rels


def test_document_has_chunks_relationship():
    rels = {r.key for r in sa_inspect(Document).mapper.relationships}
    assert "chunks" in rels


def test_profile_has_pricelists_relationship():
    rels = {r.key for r in sa_inspect(CompanyProfile).mapper.relationships}
    assert "pricelists" in rels


def test_pricelist_cascade_deletes_items():
    rel = sa_inspect(Pricelist).mapper.relationships["items"]
    assert "delete-orphan" in rel.cascade


# ---------------------------------------------------------------------------
# BoardEntry unique constraint
# ---------------------------------------------------------------------------


def test_board_entry_unique_constraint():
    table = Base.metadata.tables["board_entries"]
    constraint_names = {c.name for c in table.constraints}
    assert "uq_board_entry_profile_tender" in constraint_names


# ---------------------------------------------------------------------------
# LLMCache unique constraint
# ---------------------------------------------------------------------------


def test_llm_cache_unique_constraint():
    table = Base.metadata.tables["llm_cache"]
    constraint_names = {c.name for c in table.constraints}
    assert "uq_llm_cache_tender_prompt" in constraint_names
