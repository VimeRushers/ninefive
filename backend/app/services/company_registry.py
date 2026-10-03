"""Local company registry for IDNO lookup.

The official data2b.md registry API is not confirmed yet, so lookups resolve
against a small bundled dataset. Unknown IDNOs return None and the route
answers 404, matching the frontend mock's behaviour.
"""

COMPANIES: dict[str, dict] = {
    "1009600012346": {
        "name": "TehnoServ Grup SRL",
        "legal_form": "Societate cu răspundere limitată",
        "address": "mun. Chișinău, sect. Botanica",
        "region": "mun. Chișinău",
        "registered_at": "2009-03-17",
        "activities": [
            "46.51 Comerț cu ridicata al calculatoarelor, echipamentelor periferice și software-ului",
            "95.11 Repararea calculatoarelor și a echipamentelor periferice",
        ],
        "source": "data2b.md",
    },
}


def find_company(idno: str) -> dict | None:
    record = COMPANIES.get(idno)
    if record is None:
        return None
    return {"idno": idno, **record}
