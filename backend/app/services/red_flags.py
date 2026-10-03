"""
Pure-function red-flag / integrity indicator rules.
Rule output format: RedFlag(indicator=..., triggered=bool, evidence=[...])
Guardrail: Never state or imply corruption; use objective risk indicator language.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import NamedTuple, Sequence

from app.models.award import Award
from app.models.buyer import Buyer
from app.models.tender import Tender
from app.schemas import Citation, CitedText, RedFlag


class ChunkRef(NamedTuple):
    """A document chunk plus the metadata needed to cite it."""

    text: str
    document_id: str | None = None
    document_title: str | None = None
    page: int | None = None
    url: str | None = None


def check_short_deadline(
    tender: Tender, min_days: int = 7, citation: Citation | None = None
) -> RedFlag:
    """
    Flag tenders where the window between publication and submission deadline
    is shorter than standard statutory minimum (default 7 days).
    """
    indicator = "short_submission_window"
    if not tender.published_at or not tender.submission_deadline:
        return RedFlag(indicator=indicator, triggered=False, evidence=[])

    published = tender.published_at
    deadline = tender.submission_deadline
    # Ensure tz-naive or tz-aware consistency
    if published.tzinfo and not deadline.tzinfo:
        published = published.replace(tzinfo=None)
    elif deadline.tzinfo and not published.tzinfo:
        deadline = deadline.replace(tzinfo=None)

    window = deadline - published
    triggered = window < timedelta(days=min_days)

    evidence: list[CitedText | str] = []
    if triggered:
        evidence.append(
            CitedText(
                text=f"Fereastră scurtă de depunere: {window.days} zile ({published.strftime('%Y-%m-%d')} → {deadline.strftime('%Y-%m-%d')}). Recomandat: minim {min_days} zile.",
                citations=[citation] if citation else [],
            )
        )

    return RedFlag(indicator=indicator, triggered=triggered, evidence=evidence)


def check_single_bidder_buyer(
    buyer: Buyer | None,
    awards: Sequence[Award],
    threshold: float = 0.8,
    citation: Citation | None = None,
) -> RedFlag:
    """
    Flag buyers where historically >80% of tenders had only 1 bidder/award.
    """
    indicator = "single_bidder_history"
    if not awards:
        return RedFlag(indicator=indicator, triggered=False, evidence=[])

    # Count awards per tender
    tender_awards: dict[int, int] = {}
    for award in awards:
        if award.tender_id is not None:
            tender_awards[award.tender_id] = tender_awards.get(award.tender_id, 0) + 1

    total_tenders = len(tender_awards)
    if total_tenders < 2:  # Need sufficient historical sample
        return RedFlag(indicator=indicator, triggered=False, evidence=[])

    single_award_tenders = sum(1 for count in tender_awards.values() if count == 1)
    rate = single_award_tenders / total_tenders
    triggered = rate >= threshold

    evidence: list[CitedText | str] = []
    if triggered:
        evidence.append(
            CitedText(
                text=f"{single_award_tenders} din {total_tenders} proceduri anterioare ale acestei autorități au avut un singur ofertant ({rate:.0%}).",
                citations=[citation] if citation else [],
            )
        )

    return RedFlag(indicator=indicator, triggered=triggered, evidence=evidence)


def check_repeat_winner(
    awards: Sequence[Award],
    threshold: float = 0.5,
    citation: Citation | None = None,
) -> RedFlag:
    """
    Flag when a single supplier won > 50% of the contracts from this buyer.
    """
    indicator = "repeat_winner"
    valid_awards = [a for a in awards if a.supplier_name]
    total_awards = len(valid_awards)

    if total_awards < 3:  # Need minimum historical awards sample
        return RedFlag(indicator=indicator, triggered=False, evidence=[])

    counts: dict[str, int] = {}
    for award in valid_awards:
        name = award.supplier_name.strip()
        counts[name] = counts.get(name, 0) + 1

    top_supplier, top_count = max(counts.items(), key=lambda x: x[1])
    share = top_count / total_awards
    triggered = share > threshold

    evidence: list[CitedText | str] = []
    if triggered:
        evidence.append(
            CitedText(
                text=f"Furnizorul '{top_supplier}' a câștigat {top_count} din {total_awards} contracte atribuite ({share:.0%}).",
                citations=[citation] if citation else [],
            )
        )

    return RedFlag(indicator=indicator, triggered=triggered, evidence=evidence)


# Common brand names or trade marks to check in procurement texts
KNOWN_BRANDS = [
    "Cisco",
    "Dell",
    "HP",
    "Lenovo",
    "Intel",
    "Microsoft",
    "Apple",
    "Bosch",
    "Siemens",
    "Toyota",
    "Samsung",
    "Canon",
    "Philips",
    "Oracle",
    "SAP",
    "Schneider",
    "Daikin",
    "MikroTik",
]

BRAND_REGEX = re.compile(
    r"\b(" + "|".join(re.escape(b) for b in KNOWN_BRANDS) + r")\b", re.IGNORECASE
)
EQUIVALENT_REGEX = re.compile(
    r"(sau\s+echivalent|или\s+эквивалент|or\s+equivalent)", re.IGNORECASE
)


def check_brand_names(
    text: str | None,
    document_id: str | None = None,
    document_title: str | None = None,
    page_number: int | None = None,
    url: str | None = None,
) -> RedFlag:
    """
    Flag mentions of specific brand names without the mandatory 'sau echivalent' qualifier.
    """
    indicator = "brand_without_equivalent"
    if not text:
        return RedFlag(indicator=indicator, triggered=False, evidence=[])

    matches = BRAND_REGEX.findall(text)
    if not matches:
        return RedFlag(indicator=indicator, triggered=False, evidence=[])

    evidence: list[CitedText | str] = []
    has_unqualified_brand = False

    # Check paragraphs or lines
    for line in text.splitlines():
        line_clean = line.strip()
        if not line_clean:
            continue
        brand_match = BRAND_REGEX.search(line_clean)
        if brand_match and not EQUIVALENT_REGEX.search(line_clean):
            has_unqualified_brand = True
            citations = []
            if document_id and document_title:
                citations.append(
                    Citation(
                        document_id=document_id,
                        document_title=document_title,
                        url=url or "",
                        page=page_number,
                    )
                )
            evidence.append(
                CitedText(
                    text=f"Mențiune de marcă fără mențiunea 'sau echivalent': \"{line_clean[:120]}\"",
                    citations=citations,
                )
            )

    return RedFlag(
        indicator=indicator,
        triggered=has_unqualified_brand,
        evidence=evidence,
    )


def check_cpv_mismatch(
    tender_title: str | None,
    cpv_labels: list[str] | None,
    similarity_score: float | None = None,
    threshold: float = 0.35,
) -> RedFlag:
    """
    Flag semantic mismatch between CPV code description and tender title.
    """
    indicator = "cpv_mismatch"
    if not tender_title or not cpv_labels or similarity_score is None:
        return RedFlag(indicator=indicator, triggered=False, evidence=[])

    # If semantic similarity is low, it indicates a mismatch
    triggered = similarity_score < threshold
    evidence: list[CitedText | str] = []
    if triggered:
        evidence.append(
            CitedText(
                text=f"Posibilă neconcordanță între codul CPV ({', '.join(cpv_labels)}) și titlul achiziției ('{tender_title}'). Similaritate semantică: {similarity_score:.2f}",
                citations=[],
            )
        )

    return RedFlag(indicator=indicator, triggered=triggered, evidence=evidence)


NARROW_TOLERANCE_REGEX = re.compile(
    r"(\bde\s+exact\b|\bexact\b|\bfără\s+toleranță\b|\bfara\s+toleranta\b|"
    r"toleranță\s*(de\s*)?0\b|toleranta\s*0\b|±\s*0(?:[.,]0+)?|"
    r"\bточно\b|\bстрого\b|без\s+допуск|"
    r"\bno\s+tolerance\b|\btolerance\s*(of\s*)?0\b)",
    re.IGNORECASE,
)


def check_narrow_tolerances(
    text: str | None,
    document_id: str | None = None,
    document_title: str | None = None,
    page_number: int | None = None,
    url: str | None = None,
) -> RedFlag:
    """Flag specs that demand exact values or near-zero tolerances."""
    indicator = "narrow_tolerances"
    if not text:
        return RedFlag(indicator=indicator, triggered=False, evidence=[])

    evidence: list[CitedText | str] = []
    for line in text.splitlines():
        line_clean = line.strip()
        if not line_clean or not NARROW_TOLERANCE_REGEX.search(line_clean):
            continue

        citations: list[Citation] = []
        if document_id and document_title:
            citations.append(
                Citation(
                    document_id=document_id,
                    document_title=document_title,
                    url=url or "",
                    page=page_number,
                )
            )
        evidence.append(
            CitedText(
                text=(
                    "Cerință cu toleranță îngustă sau valoare exactă: "
                    f'"{line_clean[:120]}"'
                ),
                citations=citations,
            )
        )

    return RedFlag(indicator=indicator, triggered=bool(evidence), evidence=evidence)


def evaluate_all_red_flags(
    tender: Tender,
    buyer: Buyer | None = None,
    historical_awards: Sequence[Award] = (),
    chunk_texts: Sequence[ChunkRef] = (),
    tender_citation: Citation | None = None,
    buyer_citation: Citation | None = None,
    cpv_labels: list[str] | None = None,
    cpv_similarity: float | None = None,
) -> list[RedFlag]:
    """Run all six integrity checks, always in RED_FLAG_INDICATORS order."""
    notice_url = tender_citation.url if tender_citation else None

    brand = check_brand_names(
        tender.description,
        document_id=tender.ocds_id,
        document_title="Anunț de participare",
        url=notice_url,
    )
    narrow = check_narrow_tolerances(
        tender.description,
        document_id=tender.ocds_id,
        document_title="Anunț de participare",
        url=notice_url,
    )

    for ref in chunk_texts:
        if not brand.triggered:
            chunk_brand = check_brand_names(
                ref.text,
                document_id=ref.document_id,
                document_title=ref.document_title,
                page_number=ref.page,
                url=ref.url,
            )
            if chunk_brand.triggered:
                brand = chunk_brand

        if ref.text and NARROW_TOLERANCE_REGEX.search(ref.text):
            chunk_narrow = check_narrow_tolerances(
                ref.text,
                document_id=ref.document_id,
                document_title=ref.document_title,
                page_number=ref.page,
                url=ref.url,
            )
            narrow = RedFlag(
                indicator="narrow_tolerances",
                triggered=True,
                evidence=[*narrow.evidence, *chunk_narrow.evidence],
            )

    return [
        check_short_deadline(tender, citation=tender_citation),
        check_single_bidder_buyer(buyer, historical_awards, citation=buyer_citation),
        check_repeat_winner(historical_awards, citation=buyer_citation),
        brand,
        narrow,
        check_cpv_mismatch(tender.title, cpv_labels, cpv_similarity),
    ]
