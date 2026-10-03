"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-03
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "buyers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ocds_id", sa.String(length=128), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("idno", sa.String(length=13), nullable=True),
        sa.Column("region", sa.String(length=128), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_buyers_ocds_id", "buyers", ["ocds_id"], unique=True)
    op.create_index("ix_buyers_idno", "buyers", ["idno"], unique=False)

    op.create_table(
        "tenders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ocds_id", sa.String(length=128), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("buyer_id", sa.Integer(), nullable=True),
        sa.Column("buyer_ocds_id", sa.String(length=128), nullable=True),
        sa.Column("buyer_name", sa.Text(), nullable=True),
        sa.Column("estimated_amount", sa.Float(), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submission_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cpv_codes", postgresql.JSONB(), nullable=True),
        sa.Column("region", sa.String(length=128), nullable=True),
        sa.Column("procedure_type", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=True),
        sa.Column("raw_ocds", postgresql.JSONB(), nullable=True),
        sa.Column("ocds_packages", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["buyer_id"], ["buyers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tenders_ocds_id", "tenders", ["ocds_id"], unique=True)
    op.create_index("ix_tenders_buyer_id", "tenders", ["buyer_id"], unique=False)
    op.create_index(
        "ix_tenders_buyer_ocds_id", "tenders", ["buyer_ocds_id"], unique=False
    )

    op.create_table(
        "awards",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ocds_id", sa.String(length=128), nullable=False),
        sa.Column("tender_id", sa.Integer(), nullable=False),
        sa.Column("supplier_name", sa.Text(), nullable=True),
        sa.Column("supplier_idno", sa.String(length=13), nullable=True),
        sa.Column("supplier_ocds_id", sa.String(length=128), nullable=True),
        sa.Column("value", sa.Float(), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["tender_id"], ["tenders.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_awards_ocds_id", "awards", ["ocds_id"], unique=True)
    op.create_index("ix_awards_tender_id", "awards", ["tender_id"], unique=False)
    op.create_index(
        "ix_awards_supplier_idno", "awards", ["supplier_idno"], unique=False
    )
    op.create_index(
        "ix_awards_supplier_ocds_id", "awards", ["supplier_ocds_id"], unique=False
    )

    op.create_table(
        "bid_statistics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tender_id", sa.Integer(), nullable=False),
        sa.Column("measure", sa.String(length=64), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("related_lot", sa.String(length=128), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["tender_id"], ["tenders.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_bid_statistics_tender_id", "bid_statistics", ["tender_id"], unique=False
    )

    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ocds_id", sa.String(length=128), nullable=False),
        sa.Column("tender_id", sa.Integer(), nullable=False),
        sa.Column("participant_ocds_id", sa.String(length=128), nullable=True),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("document_type", sa.String(length=64), nullable=True),
        sa.Column("language", sa.String(length=8), nullable=True),
        sa.Column("local_path", sa.Text(), nullable=True),
        sa.Column("processed", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["tender_id"], ["tenders.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_documents_ocds_id", "documents", ["ocds_id"], unique=False)
    op.create_index(
        "ix_documents_tender_id", "documents", ["tender_id"], unique=False
    )
    op.create_index(
        "ix_documents_participant_ocds_id",
        "documents",
        ["participant_ocds_id"],
        unique=False,
    )

    op.create_table(
        "chunks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("tender_id", sa.Integer(), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(dim=1024), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"]),
        sa.ForeignKeyConstraint(["tender_id"], ["tenders.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_chunks_document_id", "chunks", ["document_id"], unique=False)
    op.create_index("ix_chunks_tender_id", "chunks", ["tender_id"], unique=False)

    op.create_table(
        "llm_cache",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tender_ocds_id", sa.String(length=128), nullable=False),
        sa.Column("prompt_version", sa.String(length=64), nullable=False),
        sa.Column("result", postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "tender_ocds_id", "prompt_version", name="uq_llm_cache_tender_prompt"
        ),
    )
    op.create_index(
        "ix_llm_cache_tender_ocds_id", "llm_cache", ["tender_ocds_id"], unique=False
    )

    op.create_table(
        "company_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("idno", sa.String(length=13), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("cpv_codes", postgresql.JSONB(), nullable=True),
        sa.Column("regions", postgresql.JSONB(), nullable=True),
        sa.Column("budget_min", sa.Float(), nullable=True),
        sa.Column("budget_max", sa.Float(), nullable=True),
        sa.Column("annual_turnover", postgresql.JSONB(), nullable=True),
        sa.Column("employee_count", sa.Integer(), nullable=True),
        sa.Column("licenses", postgresql.JSONB(), nullable=True),
        sa.Column("certifications", postgresql.JSONB(), nullable=True),
        sa.Column("embedding", Vector(dim=1024), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_company_profiles_idno", "company_profiles", ["idno"], unique=False
    )

    op.create_table(
        "pricelists",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("profile_id", sa.Integer(), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("item_count", sa.Integer(), nullable=False),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["profile_id"], ["company_profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pricelists_profile_id", "pricelists", ["profile_id"], unique=False
    )

    op.create_table(
        "catalogue_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pricelist_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("price", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["pricelist_id"], ["pricelists.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_catalogue_items_pricelist_id",
        "catalogue_items",
        ["pricelist_id"],
        unique=False,
    )

    op.create_table(
        "board_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("profile_id", sa.Integer(), nullable=False),
        sa.Column("tender_id", sa.Integer(), nullable=False),
        sa.Column("stage", sa.String(length=32), nullable=False),
        sa.Column("stage_source", sa.String(length=8), nullable=False),
        sa.Column("stage_reason", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["profile_id"], ["company_profiles.id"]),
        sa.ForeignKeyConstraint(["tender_id"], ["tenders.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "profile_id", "tender_id", name="uq_board_entry_profile_tender"
        ),
    )
    op.create_index(
        "ix_board_entries_profile_id", "board_entries", ["profile_id"], unique=False
    )
    op.create_index(
        "ix_board_entries_tender_id", "board_entries", ["tender_id"], unique=False
    )

    op.create_table(
        "tender_changes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tender_id", sa.Integer(), nullable=False),
        sa.Column("synced_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("changes", postgresql.JSONB(), nullable=False),
        sa.Column("verdict", sa.String(length=16), nullable=False),
        sa.Column("reason", postgresql.JSONB(), nullable=True),
        sa.Column("stage_before", sa.String(length=32), nullable=True),
        sa.Column("stage_after", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["tender_id"], ["tenders.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_tender_changes_tender_id", "tender_changes", ["tender_id"], unique=False
    )


def downgrade() -> None:
    op.drop_table("tender_changes")
    op.drop_table("board_entries")
    op.drop_table("catalogue_items")
    op.drop_table("pricelists")
    op.drop_table("company_profiles")
    op.drop_table("llm_cache")
    op.drop_table("chunks")
    op.drop_table("documents")
    op.drop_table("bid_statistics")
    op.drop_table("awards")
    op.drop_table("tenders")
    op.drop_table("buyers")
