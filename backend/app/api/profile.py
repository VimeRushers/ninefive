from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.embedder import embed_texts
from app.models.profile import CompanyProfile
from app.schemas import CompanyLookup, ProfileCreate, ProfileOut, ProfileUpdate

router = APIRouter()


@router.get("/lookup", response_model=CompanyLookup)
async def lookup_company(
    idno: str = Query(..., min_length=13, max_length=13),
) -> CompanyLookup:
    return CompanyLookup(
        idno=idno,
        name="Companie Exemplu SRL",
        legal_form="SRL",
        address="str. Ștefan cel Mare 1, Chișinău",
        region="Chișinău",
        registered_at="2018-05-15",
        activities=["Lucrări de construcții", "Comerț cu ridicata"],
        source="data2b.md",
    )


@router.post("", response_model=ProfileOut, status_code=201)
async def create_profile(
    payload: ProfileCreate,
    db: AsyncSession = Depends(get_db),
) -> ProfileOut:
    # Generate embedding for semantic matching
    embeddings = await embed_texts([payload.description], is_query=False)
    embedding = embeddings[0] if embeddings else None

    profile = CompanyProfile(
        idno=payload.idno,
        name=payload.name,
        description=payload.description,
        cpv_codes=payload.cpv_codes,
        regions=payload.regions,
        budget_min=payload.budget_min,
        budget_max=payload.budget_max,
        annual_turnover=payload.annual_turnover.model_dump()
        if payload.annual_turnover
        else None,
        employee_count=payload.employee_count,
        licenses=payload.licenses,
        certifications=payload.certifications,
        embedding=embedding,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return ProfileOut.model_validate(profile)


@router.get("/{profile_id}", response_model=ProfileOut)
async def get_profile(
    profile_id: int,
    db: AsyncSession = Depends(get_db),
) -> ProfileOut:
    stmt = select(CompanyProfile).where(CompanyProfile.id == profile_id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileOut.model_validate(profile)


@router.patch("/{profile_id}", response_model=ProfileOut)
async def update_profile(
    profile_id: int,
    payload: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
) -> ProfileOut:
    stmt = select(CompanyProfile).where(CompanyProfile.id == profile_id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "description" in update_data and update_data["description"]:
        embeddings = await embed_texts([update_data["description"]], is_query=False)
        if embeddings:
            profile.embedding = embeddings[0]

    for field, value in update_data.items():
        if field == "annual_turnover" and value is not None:
            setattr(
                profile,
                field,
                value.model_dump() if hasattr(value, "model_dump") else value,
            )
        else:
            setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return ProfileOut.model_validate(profile)
