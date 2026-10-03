"""Detect what changed on tender re-sync and decide relevance."""

from __future__ import annotations

from datetime import datetime
from typing import Any

CHANGE_FIELDS = {
    "deadline": "Termen limită",
    "estimated_amount": "Valoare estimată",
    "status": "Status",
    "title": "Titlu",
}

IRRELEVANT_STATUSES = {"cancelled", "unsuccessful", "withdrawn"}


def _format(field: str, value: Any) -> str:
    if value is None:
        return "—"
    if field == "estimated_amount":
        try:
            return f"{float(value):,.0f}"
        except (TypeError, ValueError):
            return str(value)
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    return str(value)


def build_changes(old: dict[str, Any], new: dict[str, Any]) -> list[str]:
    changes: list[str] = []
    for field, label in CHANGE_FIELDS.items():
        before = old.get(field)
        after = new.get(field)
        if before != after:
            changes.append(
                f"{label}: {_format(field, before)} → {_format(field, after)}"
            )
    return changes


def verdict_for(status: str | None) -> str:
    return "irrelevant" if status in IRRELEVANT_STATUSES else "still_relevant"
