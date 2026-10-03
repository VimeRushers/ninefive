"""Eligibility helpers shared by the tender analysis and the board view.

Board cards need a fast, deterministic eligibility summary (no LLM per card),
so the fallback requirement set is evaluated directly against the profile.
"""

from app.models.document import Document
from app.models.profile import CompanyProfile
from app.models.tender import Tender
from app.schemas import Citation, EligibilityItem, EligibilitySummary


def fallback_eligibility_items(
    tender: Tender, documents: list[Document]
) -> list[EligibilityItem]:
    document = documents[0] if documents else None

    def cited(page: int) -> Citation | None:
        if document is None:
            return None
        return Citation(
            document_id=str(document.id),
            document_title=document.title or f"Document {document.id}",
            url=document.url or "",
            page=page,
        )

    return [
        EligibilityItem(
            requirement="Experiență similară în domeniul achiziției în ultimii 3 ani",
            requirement_type="technical",
            threshold="Cel puțin 1 contract similar",
            source_page=1,
            citation=cited(1),
        ),
        EligibilityItem(
            requirement="Cifra de afaceri medie anuală în ultimii 3 ani",
            requirement_type="financial",
            threshold=f"{tender.estimated_amount * 0.5:,.0f} MDL"
            if tender.estimated_amount
            else "500,000 MDL",
            source_page=2,
            citation=cited(2),
        ),
        EligibilityItem(
            requirement="Garanție de bună execuție a contractului",
            requirement_type="administrative",
            threshold="5% din valoarea contractului",
            source_page=2,
            citation=cited(2),
        ),
    ]


def evaluate_items(
    items: list[EligibilityItem],
    profile: CompanyProfile | None,
    tender: Tender,
) -> None:
    """Set `met` on each item by comparing against the profile (None = unknown)."""
    for item in items:
        if profile is None:
            item.met = None
        elif item.requirement_type == "financial" and profile.annual_turnover:
            turnover_amount = (
                profile.annual_turnover.get("amount", 0.0)
                if isinstance(profile.annual_turnover, dict)
                else 0.0
            )
            required = (tender.estimated_amount or 0.0) * 0.5
            item.met = turnover_amount >= required
        elif item.requirement_type == "technical" and profile.certifications:
            item.met = len(profile.certifications) > 0
        else:
            item.met = True


def board_eligibility(
    tender: Tender, profile: CompanyProfile | None
) -> tuple[EligibilitySummary, list[str]]:
    items = fallback_eligibility_items(tender, list(tender.documents or []))
    evaluate_items(items, profile, tender)

    met_count = sum(1 for item in items if item.met is True)
    unknown_count = sum(1 for item in items if item.met is None)
    summary = EligibilitySummary(
        met_count=met_count,
        total_count=len(items),
        unknown_count=unknown_count,
    )
    reasons = [item.requirement for item in items if item.met is False]
    return summary, reasons
