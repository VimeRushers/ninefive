from app.services.tags import tags_for_cpv


def test_it_cpv_gives_it_tag():
    assert tags_for_cpv(["30213100-6"]) == ["IT"]


def test_unknown_cpv_gets_default_tag():
    assert tags_for_cpv(["99999999-9"]) == ["Public Procurement"]


def test_empty_cpv_gets_default_tag():
    assert tags_for_cpv(None) == ["Public Procurement"]


def test_multiple_distinct_tags_deduplicated():
    assert tags_for_cpv(["30213100-6", "45200000-9", "30232110-8"]) == [
        "IT",
        "Construction",
    ]
