"""
Pure-function red-flag / integrity indicator rules.
Rule output format: RedFlag(indicator=..., triggered=bool, evidence=[...])
Guardrail: Never state or imply corruption; use objective risk indicator language.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Sequence

from app.models.award import Award
from app.models.buyer import Buyer
from app.models.tender import Tender
from app.schemas import Citation, CitedText, RedFlag


def check_short_deadline(tender: Tender, min_days: int = 7) -> RedFlag:
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
                citations=[],
            )
        )

    return RedFlag(indicator=indicator, triggered=triggered, evidence=evidence)


def check_single_bidder_buyer(
    buyer: Buyer | None, awards: Sequence[Award], threshold: float = 0.8
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
                citations=[],
            )
        )

    return RedFlag(indicator=indicator, triggered=triggered, evidence=evidence)


def check_repeat_winner(awards: Sequence[Award], threshold: float = 0.5) -> RedFlag:
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
                citations=[],
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
                        url="",
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


def evaluate_all_red_flags(
    tender: Tender,
    buyer: Buyer | None = None,
    historical_awards: Sequence[Award] = (),
    chunk_texts: Sequence[tuple[str, str, int]] = (),  # (text, doc_title, page)
) -> list[RedFlag]:
    """Run all integrity checks on a tender."""
    flags = [
        check_short_deadline(tender),
        check_single_bidder_buyer(buyer, historical_awards),
        check_repeat_winner(historical_awards),
    ]

    # Check brand names on tender description
    brand_flag = check_brand_names(tender.description)
    if not brand_flag.triggered and chunk_texts:
        for text, doc_title, page in chunk_texts:
            chunk_flag = check_brand_names(
                text,
                document_id=str(tender.id),
                document_title=doc_title,
                page_number=page,
            )
            if chunk_flag.triggered:
                brand_flag = chunk_flag
                break
    flags.append(brand_flag)

    return flags
