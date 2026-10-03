"""Deterministic board tags derived from CPV codes (no LLM)."""

# First two digits of the CPV code -> human tag
CPV_TAGS = {
    "09": "Energy",
    "15": "Food",
    "30": "IT",
    "31": "Equipment",
    "32": "IT",
    "33": "Medical",
    "34": "Transport",
    "39": "Furniture",
    "45": "Construction",
    "48": "Software",
    "50": "Services",
    "72": "IT",
    "85": "Medical",
    "90": "Environment",
}

DEFAULT_TAG = "Public Procurement"


def tags_for_cpv(cpv_codes: list[str] | None) -> list[str]:
    tags: list[str] = []
    for code in cpv_codes or []:
        tag = CPV_TAGS.get(str(code)[:2])
        if tag and tag not in tags:
            tags.append(tag)
    return tags or [DEFAULT_TAG]
