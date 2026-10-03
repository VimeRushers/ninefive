from app.api.tenders import _build_eligibility_prompt
from app.models.tender import Tender
from app.services.red_flags import ChunkRef
from app.services.redaction import redact


def test_redacts_idnp_contacts_and_iban():
    text = (
        "IDNP 2004001234567, email ion@example.com, tel 068766736, "
        "IBAN MD94AG000000022513849143"
    )

    out = redact(text)

    assert "2004001234567" not in out
    assert "ion@example.com" not in out
    assert "068766736" not in out
    assert "MD94AG000000022513849143" not in out


def test_masks_signature_and_beneficiary_lines():
    out = redact("Numele beneficiarului efectiv: Ion Popescu\n(semnătura autorizată)")

    assert "Ion Popescu" not in out
    assert "semnătura" not in out.lower()


def test_eligibility_prompt_contains_no_idnp():
    tender = Tender(id=1, ocds_id="ocds-1", title="T", description="Contact: 079123456")
    refs = [
        ChunkRef(
            text="IDNP 2004001234567 (semnătura autorizată)",
            document_id="1",
            document_title="Caiet",
            page=1,
        )
    ]

    prompt = _build_eligibility_prompt(tender, refs, [], None)

    assert "2004001234567" not in prompt
    assert "semnătura" not in prompt.lower()
