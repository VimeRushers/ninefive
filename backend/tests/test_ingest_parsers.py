"""
Unit tests for the pure parsing helpers in scripts/ingest.py.

No database, no network, no fixtures required — these run in milliseconds
and protect the API-specific extraction logic most likely to have subtle bugs.
"""

from datetime import datetime, timezone

import pytest
from scripts.ingest import (
    extract_cpv_codes,
    extract_idno,
    find_buyer_party,
    find_cn_url,
    parse_datetime,
)

# ---------------------------------------------------------------------------
# parse_datetime
# ---------------------------------------------------------------------------


class TestParseDatetime:
    def test_z_suffix_becomes_utc(self):
        dt = parse_datetime("2024-03-15T10:30:00Z")
        assert dt == datetime(2024, 3, 15, 10, 30, 0, tzinfo=timezone.utc)

    def test_positive_offset_preserved(self):
        dt = parse_datetime("2024-03-15T12:30:00+02:00")
        assert dt is not None
        # UTC equivalent is 10:30
        assert dt.utcoffset().total_seconds() == 7200

    def test_negative_offset_preserved(self):
        dt = parse_datetime("2024-01-01T00:00:00-05:00")
        assert dt is not None
        assert dt.utcoffset().total_seconds() == -18000

    def test_naive_datetime_gets_utc(self):
        # Some older OCDS records omit timezone info
        dt = parse_datetime("2024-06-01T08:00:00")
        assert dt is not None
        assert dt.tzinfo == timezone.utc

    def test_date_only_string_without_time(self):
        # --start / --end are passed as "2024-01-01T00:00:00" by the CLI
        dt = parse_datetime("2024-01-01T00:00:00")
        assert dt == datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    def test_none_returns_none(self):
        assert parse_datetime(None) is None

    def test_empty_string_returns_none(self):
        assert parse_datetime("") is None

    def test_garbage_returns_none(self):
        assert parse_datetime("not-a-date") is None

    def test_result_is_always_timezone_aware(self):
        for value in (
            "2024-05-01T00:00:00Z",
            "2024-05-01T00:00:00+03:00",
            "2024-05-01T00:00:00",
        ):
            dt = parse_datetime(value)
            assert dt is not None
            assert dt.tzinfo is not None, f"Expected tz-aware for {value!r}"


# ---------------------------------------------------------------------------
# extract_idno
# ---------------------------------------------------------------------------


class TestExtractIdno:
    def test_standard_idno(self):
        assert extract_idno("MD-IDNO-1234567890123") == "1234567890123"

    def test_shorter_idno(self):
        # Some records may have fewer digits; we don't validate length here
        assert extract_idno("MD-IDNO-123") == "123"

    def test_no_prefix_returns_none(self):
        assert extract_idno("1234567890123") is None

    def test_wrong_prefix_returns_none(self):
        assert extract_idno("MD-EDRPOU-1234567890123") is None

    def test_none_input_returns_none(self):
        assert extract_idno(None) is None

    def test_empty_string_returns_none(self):
        assert extract_idno("") is None

    def test_prefix_only_returns_none(self):
        # "MD-IDNO-" with nothing after → empty IDNO is treated as None
        assert extract_idno("MD-IDNO-") is None

    def test_real_world_style_party_id(self):
        # As it would appear in parties[].id from the API
        assert extract_idno("MD-IDNO-1003600033980") == "1003600033980"


# ---------------------------------------------------------------------------
# extract_cpv_codes
# ---------------------------------------------------------------------------


class TestExtractCpvCodes:
    def test_single_item(self):
        items = [{"classification": {"id": "45000000-7", "scheme": "CPV"}}]
        assert extract_cpv_codes(items) == ["45000000-7"]

    def test_deduplicates_codes(self):
        items = [
            {"classification": {"id": "45000000-7"}},
            {"classification": {"id": "45000000-7"}},
            {"classification": {"id": "45200000-9"}},
        ]
        result = extract_cpv_codes(items)
        assert result == ["45000000-7", "45200000-9"]
        assert len(result) == 2

    def test_returns_sorted(self):
        items = [
            {"classification": {"id": "72000000-5"}},
            {"classification": {"id": "45000000-7"}},
            {"classification": {"id": "33000000-0"}},
        ]
        result = extract_cpv_codes(items)
        assert result == sorted(result)

    def test_item_with_no_classification(self):
        items = [{"description": "some item"}]
        assert extract_cpv_codes(items) == []

    def test_item_with_classification_but_no_id(self):
        items = [{"classification": {"scheme": "CPV"}}]
        assert extract_cpv_codes(items) == []

    def test_empty_items_list(self):
        assert extract_cpv_codes([]) == []

    def test_mixed_valid_and_missing(self):
        items = [
            {"classification": {"id": "45000000-7"}},
            {"description": "no classification here"},
            {"classification": {"id": "72000000-5"}},
        ]
        result = extract_cpv_codes(items)
        assert "45000000-7" in result
        assert "72000000-5" in result
        assert len(result) == 2


# ---------------------------------------------------------------------------
# find_buyer_party
# ---------------------------------------------------------------------------


class TestFindBuyerParty:
    def test_finds_buyer_by_role(self):
        parties = [
            {"id": "MD-IDNO-111", "name": "Supplier Co", "roles": ["supplier"]},
            {"id": "MD-IDNO-222", "name": "Ministry of Health", "roles": ["buyer"]},
        ]
        result = find_buyer_party(parties)
        assert result is not None
        assert result["id"] == "MD-IDNO-222"

    def test_returns_none_when_no_buyer(self):
        parties = [
            {"id": "MD-IDNO-111", "name": "Supplier Co", "roles": ["supplier"]},
        ]
        assert find_buyer_party(parties) is None

    def test_empty_parties(self):
        assert find_buyer_party([]) is None

    def test_party_with_multiple_roles_including_buyer(self):
        # A party can legitimately have both "buyer" and "procuringEntity" roles
        parties = [
            {
                "id": "MD-IDNO-333",
                "name": "Agency",
                "roles": ["buyer", "procuringEntity"],
            },
        ]
        result = find_buyer_party(parties)
        assert result is not None
        assert result["id"] == "MD-IDNO-333"

    def test_party_with_no_roles_key(self):
        parties = [{"id": "MD-IDNO-444", "name": "Unknown"}]
        assert find_buyer_party(parties) is None

    def test_returns_first_buyer_when_multiple(self):
        # Edge case: malformed data with two buyer parties
        parties = [
            {"id": "MD-IDNO-111", "roles": ["buyer"]},
            {"id": "MD-IDNO-222", "roles": ["buyer"]},
        ]
        result = find_buyer_party(parties)
        assert result["id"] == "MD-IDNO-111"


# ---------------------------------------------------------------------------
# find_cn_url
# ---------------------------------------------------------------------------


class TestFindCnUrl:
    # Realistic package URLs: the OCID is the last segment in the CN URL,
    # whereas PN / EV / NP packages have a stage suffix after a hyphen.
    OCID = "ocds-1234ab-MD-1234567890"
    PACKAGES = [
        "https://public.mtender.gov.md/budgets/ocds-1234ab-MD-1234567890-PN-1234567890",
        "https://public.mtender.gov.md/tenders/ocds-1234ab-MD-1234567890",
        "https://public.mtender.gov.md/tenders/ocds-1234ab-MD-1234567890-EV-1234567890",
    ]

    def test_finds_cn_package(self):
        url = find_cn_url(self.PACKAGES, self.OCID)
        assert url == "https://public.mtender.gov.md/tenders/ocds-1234ab-MD-1234567890"

    def test_ignores_pn_package(self):
        url = find_cn_url(self.PACKAGES, self.OCID)
        assert url is not None
        assert "-PN-" not in url

    def test_ignores_ev_package(self):
        url = find_cn_url(self.PACKAGES, self.OCID)
        assert url is not None
        assert "-EV-" not in url

    def test_trailing_slash_still_matches(self):
        packages = [p + "/" for p in self.PACKAGES]
        url = find_cn_url(packages, self.OCID)
        assert url is not None
        assert url.endswith(self.OCID + "/")

    def test_returns_none_when_no_match(self):
        packages = [
            "https://public.mtender.gov.md/budgets/ocds-1234ab-MD-1234567890-PN-000",
            "https://public.mtender.gov.md/tenders/ocds-1234ab-MD-1234567890-EV-000",
        ]
        assert find_cn_url(packages, self.OCID) is None

    def test_empty_packages_returns_none(self):
        assert find_cn_url([], self.OCID) is None

    def test_different_ocid_does_not_match(self):
        other_ocid = "ocds-9999zz-MD-9999999999"
        assert find_cn_url(self.PACKAGES, other_ocid) is None
