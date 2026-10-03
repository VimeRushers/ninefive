from scripts.fetch_mtender import _participant_documents


def test_collects_award_party_and_bid_documents():
    compiled = {
        "awards": [
            {
                "id": "award-1",
                "suppliers": [{"id": "MD-IDNO-123"}],
                "documents": [
                    {"id": "doc-a", "url": "http://x/a.pdf", "title": "Oferta"}
                ],
            }
        ],
        "parties": [
            {
                "id": "party-9",
                "roles": ["tenderer"],
                "documents": [{"id": "doc-b", "uri": "http://x/b.pdf"}],
            }
        ],
        "bids": {
            "details": [
                {
                    "id": "bid-1",
                    "tenderers": [{"id": "party-8"}],
                    "documents": [{"id": "doc-c", "url": "http://x/c.pdf"}],
                }
            ]
        },
    }

    docs = _participant_documents(compiled)
    by_id = {d["ocds_id"]: d for d in docs}

    assert set(by_id) == {"doc-a", "doc-b", "doc-c"}
    assert by_id["doc-a"]["participant_ocds_id"] == "MD-IDNO-123"
    assert by_id["doc-b"]["participant_ocds_id"] == "party-9"
    assert by_id["doc-c"]["participant_ocds_id"] == "party-8"


def test_skips_documents_without_url():
    compiled = {"awards": [{"suppliers": [{"id": "p"}], "documents": [{"id": "d"}]}]}

    assert _participant_documents(compiled) == []
