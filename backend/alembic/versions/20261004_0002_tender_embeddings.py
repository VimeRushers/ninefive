"""tender embeddings and vector indexes

Revision ID: 0002_tender_embeddings
Revises: 0001_initial
Create Date: 2026-10-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

revision: str = "0002_tender_embeddings"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Approximate nearest-neighbour indexes for cosine distance
VECTOR_INDEXES = [
    ("ix_tenders_embedding_hnsw", "tenders"),
    ("ix_chunks_embedding_hnsw", "chunks"),
    ("ix_company_profiles_embedding_hnsw", "company_profiles"),
]


def upgrade() -> None:
    op.add_column(
        "tenders", sa.Column("embedding", Vector(dim=1024), nullable=True)
    )
    for name, table in VECTOR_INDEXES:
        op.execute(
            f"CREATE INDEX {name} ON {table} USING hnsw (embedding vector_cosine_ops)"
        )


def downgrade() -> None:
    for name, _table in VECTOR_INDEXES:
        op.execute(f"DROP INDEX IF EXISTS {name}")
    op.drop_column("tenders", "embedding")
