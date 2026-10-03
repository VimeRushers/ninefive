from datetime import datetime, timezone

from app.services.change_tracking import build_changes, verdict_for


def test_build_changes_reports_deadline_move():
    old = {"deadline": datetime(2026, 5, 10, tzinfo=timezone.utc)}
    new = {"deadline": datetime(2026, 5, 17, tzinfo=timezone.utc)}

    changes = build_changes(old, new)

    assert changes == ["Termen limită: 2026-05-10 → 2026-05-17"]


def test_build_changes_empty_when_unchanged():
    old = {"status": "active", "title": "Laptopuri"}

    assert build_changes(old, dict(old)) == []


def test_verdict_flags_cancelled_as_irrelevant():
    assert verdict_for("cancelled") == "irrelevant"
    assert verdict_for("active") == "still_relevant"
