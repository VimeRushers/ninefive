import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.embedder import embed_texts
from app.models.catalogue import CatalogueItem
from app.models.pricelist import Pricelist
from app.models.profile import CompanyProfile
from app.schemas import CatalogueItem as CatalogueItemSchema
from app.schemas import CatalogueItemUpdate, CompanyLookup, Pricelist as PricelistSchema
from app.schemas import ProfileCreate, ProfileOut, ProfileUpdate
from app.services.pricelist_parser import parse_pricelist

router = APIRouter()


async def _get_profile_or_404(db: AsyncSession, profile_id: int) -> CompanyProfile:
    res = await db.execute(
        select(CompanyProfile).where(CompanyProfile.id == profile_id)
    )
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


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


@router.get("/{profile_id}/pricelists", response_model=list[PricelistSchema])
async def list_pricelists(
    profile_id: int,
    db: AsyncSession = Depends(get_db),
) -> list[PricelistSchema]:
    await _get_profile_or_404(db, profile_id)
    res = await db.execute(
        select(Pricelist)
        .where(Pricelist.profile_id == profile_id)
        .order_by(Pricelist.uploaded_at.desc())
    )
    return [PricelistSchema.model_validate(p) for p in res.scalars().all()]


@router.post(
    "/{profile_id}/pricelists", response_model=PricelistSchema, status_code=201
)
async def upload_pricelist(
    profile_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> PricelistSchema:
    await _get_profile_or_404(db, profile_id)

    filename = Path(file.filename or "pricelist").name
    dest_dir = Path(settings.pricelists_dir) / str(profile_id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / filename
    with dest.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    pricelist = Pricelist(
        profile_id=profile_id,
        file_name=filename,
        status="processing",
        item_count=0,
    )
    db.add(pricelist)
    await db.commit()
    await db.refresh(pricelist)

    # Parsing runs inline: pricelists are small and the frontend polls until
    # the status is no longer "processing". Move to a worker queue at scale.
    items = parse_pricelist(dest)
    for item in items:
        db.add(
            CatalogueItem(
                pricelist_id=pricelist.id,
                name=item.name,
                description=item.description,
                price=(
                    {"amount": item.price_amount, "currency": item.price_currency}
                    if item.price_amount is not None
                    else None
                ),
            )
        )
    pricelist.status = "ready" if items else "failed"
    pricelist.item_count = len(items)
    await db.commit()
    await db.refresh(pricelist)
    return PricelistSchema.model_validate(pricelist)


@router.delete("/{profile_id}/pricelists/{pricelist_id}", status_code=204)
async def delete_pricelist(
    profile_id: int,
    pricelist_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    res = await db.execute(
        select(Pricelist).where(
            Pricelist.id == pricelist_id, Pricelist.profile_id == profile_id
        )
    )
    pricelist = res.scalar_one_or_none()
    if not pricelist:
        raise HTTPException(status_code=404, detail="Pricelist not found")

    await db.execute(
        delete(CatalogueItem).where(CatalogueItem.pricelist_id == pricelist_id)
    )
    await db.delete(pricelist)
    await db.commit()


async def _get_catalogue_item_or_404(
    db: AsyncSession, profile_id: int, item_id: int
) -> CatalogueItem:
    res = await db.execute(
        select(CatalogueItem)
        .join(Pricelist, CatalogueItem.pricelist_id == Pricelist.id)
        .where(CatalogueItem.id == item_id, Pricelist.profile_id == profile_id)
    )
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Catalogue item not found")
    return item


@router.get("/{profile_id}/catalogue", response_model=list[CatalogueItemSchema])
async def list_catalogue(
    profile_id: int,
    db: AsyncSession = Depends(get_db),
) -> list[CatalogueItemSchema]:
    await _get_profile_or_404(db, profile_id)
    res = await db.execute(
        select(CatalogueItem)
        .join(Pricelist, CatalogueItem.pricelist_id == Pricelist.id)
        .where(Pricelist.profile_id == profile_id)
        .order_by(CatalogueItem.id)
    )
    return [CatalogueItemSchema.model_validate(item) for item in res.scalars().all()]


@router.patch("/{profile_id}/catalogue/{item_id}", response_model=CatalogueItemSchema)
async def update_catalogue_item(
    profile_id: int,
    item_id: int,
    payload: CatalogueItemUpdate,
    db: AsyncSession = Depends(get_db),
) -> CatalogueItemSchema:
    item = await _get_catalogue_item_or_404(db, profile_id, item_id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return CatalogueItemSchema.model_validate(item)


@router.delete("/{profile_id}/catalogue/{item_id}", status_code=204)
async def delete_catalogue_item(
    profile_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    item = await _get_catalogue_item_or_404(db, profile_id, item_id)
    pricelist = await db.get(Pricelist, item.pricelist_id)

    await db.delete(item)
    if pricelist is not None and pricelist.item_count > 0:
        pricelist.item_count -= 1
    await db.commit()
