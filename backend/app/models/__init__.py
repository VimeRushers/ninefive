# Re-export all ORM models so that a single `import app.models` registers
# every table with Base.metadata (required by Alembic autogenerate and
# any code that calls Base.metadata.create_all).

from app.models.award import Award
from app.models.bid import BidStatistic
from app.models.board import BoardEntry
from app.models.buyer import Buyer
from app.models.catalogue import CatalogueItem
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.llm_cache import LLMCache
from app.models.pricelist import Pricelist
from app.models.profile import CompanyProfile
from app.models.tender import Tender
from app.models.tender_change import TenderChange
from app.models.tender_item import TenderItem

__all__ = [
    "Award",
    "BidStatistic",
    "BoardEntry",
    "Buyer",
    "CatalogueItem",
    "Chunk",
    "Document",
    "LLMCache",
    "Pricelist",
    "CompanyProfile",
    "Tender",
    "TenderChange",
    "TenderItem",
]
