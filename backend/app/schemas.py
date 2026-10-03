"""
Pydantic schemas — source of truth for all API I/O.
Shared between the API layer and frontend mock data.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal, Union

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Shared primitives
# ---------------------------------------------------------------------------


class Language(str, Enum):
    ro = "ro"
    ru = "ru"
    en = "en"


class MoneyAmount(BaseModel):
    amount: float
    currency: str = "MDL"


class Citation(BaseModel):
    document_id: str
    document_title: str
    url: str
    page: int | None = None


class CitedText(BaseModel):
    text: str
    citations: list[Citation] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Company profile
# ---------------------------------------------------------------------------


class ProfileCreate(BaseModel):
    idno: str | None = Field(None, description="Moldovan tax ID (IDNO), 13 digits")
    name: str
    description: str = Field(
        ..., description="Free-text description used for semantic matching"
    )
    cpv_codes: list[str] = Field(default_factory=list)
    regions: list[str] = Field(default_factory=list)
    budget_min: float | None = None
    budget_max: float | None = None
    annual_turnover: MoneyAmount | None = None
    employee_count: int | None = None
    licenses: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)


class ProfileOut(ProfileCreate):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    idno: str | None = None
    name: str | None = None
    description: str | None = None
    cpv_codes: list[str] | None = None
    regions: list[str] | None = None
    budget_min: float | None = None
    budget_max: float | None = None
    annual_turnover: MoneyAmount | None = None
    employee_count: int | None = None
    licenses: list[str] | None = None
    certifications: list[str] | None = None


class CompanyLookup(BaseModel):
    idno: str
    name: str
    legal_form: str | None = None
    address: str | None = None
    region: str | None = None
    registered_at: str | None = None
    activities: list[str] = Field(default_factory=list)
    source: str = "data2b.md"


# ---------------------------------------------------------------------------
# Catalogue & Pricelists
# ---------------------------------------------------------------------------

PricelistStatus = Literal["processing", "ready", "failed"]


class Pricelist(BaseModel):
    id: int
    file_name: str
    uploaded_at: datetime
    status: PricelistStatus
    item_count: int


class CatalogueItem(BaseModel):
    id: int
    pricelist_id: int
    name: str
    description: str
    price: MoneyAmount


class CatalogueItemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: MoneyAmount | None = None


# ---------------------------------------------------------------------------
# Tender board
# ---------------------------------------------------------------------------

Stage = Literal["new", "questionable", "not_interested", "lost", "won"]
STAGES: tuple[Stage, ...] = ("new", "questionable", "not_interested", "lost", "won")
StageSource = Literal["auto", "manual"]


class EligibilitySummary(BaseModel):
    met_count: int
    total_count: int
    unknown_count: int


class UnmetParameter(BaseModel):
    kind: Literal["unmet_parameter"] = "unmet_parameter"
    parameter: str
    required: str
    ours: str | None = None
    citation: Citation


class CatalogueMatchCandidate(BaseModel):
    item_id: int
    name: str
    price: MoneyAmount
    similarity: float = Field(..., ge=0, le=1)


class GrayZone(BaseModel):
    kind: Literal["gray_zone"] = "gray_zone"
    tender_item: CitedText
    explanation: str
    closest_items: list[CatalogueMatchCandidate] = Field(default_factory=list)


QuestionableReason = Union[UnmetParameter, GrayZone]


class BoardCard(BaseModel):
    tender_id: str
    title: str
    mtender_url: str
    buyer_id: str
    buyer_name: str
    estimated_value: MoneyAmount | None = None
    region: str | None = None
    published_at: datetime
    modified_at: datetime | None = None
    tender_start_at: datetime | None = None
    deadline: datetime | None = None
    stage: Stage = "new"
    stage_source: StageSource = "auto"
    stage_reason: str | None = None
    questionable_reasons: list[QuestionableReason] = Field(default_factory=list)
    eligibility: EligibilitySummary | None = None
    win_probability: float | None = None
    tags: list[str] = Field(default_factory=list)
    red_flag_count: int = 0
    changed_in_last_sync: bool = False


class BoardResponse(BaseModel):
    profile_id: int
    cards: list[BoardCard]
    last_sync_at: datetime | None = None


class BoardFilters(BaseModel):
    q: str | None = None
    published_from: str | None = None
    published_to: str | None = None
    modified_from: str | None = None
    modified_to: str | None = None
    start_from: str | None = None
    start_to: str | None = None
    price_min: float | None = None
    price_max: float | None = None
    region: str | None = None
    tags: list[str] = Field(default_factory=list)
    stages: list[Stage] = Field(default_factory=list)
    win_min: float | None = None
    win_max: float | None = None
    eligibility_min: float | None = None
    eligibility_max: float | None = None


class StageUpdate(BaseModel):
    stage: Stage


# ---------------------------------------------------------------------------
# Tender Detail
# ---------------------------------------------------------------------------

MTenderStatus = Literal[
    "planning",
    "planned",
    "active",
    "cancelled",
    "unsuccessful",
    "complete",
    "withdrawn",
]
DocumentAnalysisStatus = Literal["pending", "analyzing", "analyzed", "failed"]


class TenderDocument(BaseModel):
    document_id: str
    title: str
    url: str
    source: str = "mtender"
    participant_id: str | None = None
    language: Language | None = None
    page_count: int | None = None
    published_at: datetime | None = None
    analysis_status: DocumentAnalysisStatus = "analyzed"
    analyzed_at: datetime | None = None


class ProductMatch(BaseModel):
    tender_item: CitedText
    catalogue_item: CatalogueMatchCandidate | None = None
    estimated_unit_price: MoneyAmount | None = None


RelevanceVerdict = Literal["still_relevant", "irrelevant"]


class TenderChange(BaseModel):
    synced_at: datetime
    changes: list[str]
    verdict: RelevanceVerdict
    reason: CitedText
    stage_before: Stage
    stage_after: Stage


class TenderDetail(BaseModel):
    tender_id: str
    ocid: str
    title: str
    description: str
    language: Language = Language.ro
    buyer_id: str
    buyer_name: str
    estimated_value: MoneyAmount | None = None
    region: str | None = None
    cpv_codes: list[str] = Field(default_factory=list)
    procedure_type: str = "open"
    mtender_status: MTenderStatus = "active"
    mtender_url: str = ""
    published_at: datetime
    modified_at: datetime | None = None
    tender_start_at: datetime | None = None
    deadline: datetime | None = None
    stage: Stage | None = None
    stage_source: StageSource | None = None
    stage_reason: str | None = None
    summary: list[CitedText] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    documents: list[TenderDocument] = Field(default_factory=list)
    product_matches: list[ProductMatch] = Field(default_factory=list)
    changes: list[TenderChange] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------


class SearchResult(BaseModel):
    tender_id: str
    title: str
    buyer_name: str
    estimated_value: MoneyAmount | None
    deadline: datetime | None
    fit_score: float = Field(..., ge=0, le=1)
    match_snippet: str = Field(
        ..., description="Why this tender matched (semantic highlight)"
    )
    red_flag_count: int = 0


class SearchResponse(BaseModel):
    query: str
    profile_id: int | None
    results: list[SearchResult]
    total: int


# ---------------------------------------------------------------------------
# Red flags / integrity indicators
# ---------------------------------------------------------------------------

RedFlagIndicator = Literal[
    "short_submission_window",
    "single_bidder_history",
    "repeat_winner",
    "brand_without_equivalent",
    "narrow_tolerances",
    "cpv_mismatch",
]

RED_FLAG_INDICATORS: tuple[str, ...] = (
    "short_submission_window",
    "single_bidder_history",
    "repeat_winner",
    "brand_without_equivalent",
    "narrow_tolerances",
    "cpv_mismatch",
)


class RedFlag(BaseModel):
    indicator: str
    triggered: bool
    evidence: list[Union[CitedText, str]] = Field(
        default_factory=list,
        description="Data points or page citations supporting the indicator",
    )


# ---------------------------------------------------------------------------
# Eligibility checker
# ---------------------------------------------------------------------------

RequirementType = Literal["financial", "technical", "legal", "administrative"]


class EligibilityItem(BaseModel):
    requirement: str
    requirement_type: str  # "financial" | "technical" | "legal" | "administrative"
    threshold: str | None = None
    source_page: int | None = None
    citation: Citation | None = None
    met: bool | None = None  # None = not evaluated against a profile
    notes: str | None = None


class EligibilityChecklist(BaseModel):
    tender_id: str
    profile_id: int | None
    items: list[EligibilityItem]
    met_count: int
    total_count: int
    disclaimer: str = (
        "This checklist is generated by an AI assistant and is not legal advice. "
        "Always verify requirements with the original tender documents."
    )


# ---------------------------------------------------------------------------
# Win-chance estimate
# ---------------------------------------------------------------------------


class WinChanceEstimate(BaseModel):
    tender_id: str
    estimated_probability: float | None = Field(None, ge=0, le=1)
    typical_bidder_count: float | None = None
    typical_winning_ratio: float | None = Field(
        None, description="Typical winning price / estimated value"
    )
    buyer_concentration: float | None = Field(
        None, description="Fraction of contracts awarded to a single repeat winner"
    )
    disclaimer: str = (
        "Win-chance is estimated from historical patterns only. "
        "Active competitor bids are not public before bid opening."
    )


# ---------------------------------------------------------------------------
# Full tender analysis  (GET /tenders/{id}/analysis)
# ---------------------------------------------------------------------------


class TenderAnalysis(BaseModel):
    tender_id: str
    fit_score: float | None = None
    red_flags: list[RedFlag] = Field(default_factory=list)
    eligibility: EligibilityChecklist | None = None
    win_chance: WinChanceEstimate | None = None


# ---------------------------------------------------------------------------
# Competitor analysis  (GET /tenders/{id}/competitors)
# ---------------------------------------------------------------------------

ParticipantStatus = Literal["winner", "rejected", "disqualified", "under_evaluation"]


class Participant(BaseModel):
    participant_id: str
    name: str
    idno: str | None = None
    is_us: bool = False
    status: ParticipantStatus
    bid_price: MoneyAmount | None = None
    price_vs_estimate: float | None = None
    rejection_reason: CitedText | None = None
    strengths: list[CitedText] = Field(default_factory=list)
    weaknesses: list[CitedText] = Field(default_factory=list)
    document_ids: list[str] = Field(default_factory=list)


CompetitorAnalysisState = Literal["no_documents", "analyzing", "up_to_date"]


class CompetitorAnalysis(BaseModel):
    tender_id: str
    state: CompetitorAnalysisState = "up_to_date"
    analyzed_at: datetime | None = None
    participants: list[Participant] = Field(default_factory=list)
    lessons: list[CitedText] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Buyer profile  (GET /buyers/{id}/profile)
# ---------------------------------------------------------------------------


class TopWinner(BaseModel):
    name: str
    idno: str | None = None
    contracts_won: int = 0
    total_value: MoneyAmount = Field(default_factory=lambda: MoneyAmount(amount=0.0))
    share: float = 0.0


class BuyerProfile(BaseModel):
    buyer_id: str
    name: str
    total_tenders: int
    single_bidder_rate: float | None = Field(None, ge=0, le=1)
    repeat_winner_concentration: float | None = Field(None, ge=0, le=1)
    top_winners: list[Union[TopWinner, dict[str, Any]]] = Field(default_factory=list)
