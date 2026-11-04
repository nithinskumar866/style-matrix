from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, concurrency
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.schemas.clothing_schema import ImageAddRequest, ItemUpdateRequest, SaveOutfitRequest, UndoWearRequest, WashRequest, WearTodayRequest
from app.database import get_db
from app.services import get_current_user
from app.util import predict_category, get_clip_embedding
from app.crud import get_user
from sqlalchemy import insert
from app.models import ClothingItem, SavedOutfit, WearEvent
from app.outfit_rules import MAX_CATEGORY, SLOT_CATEGORIES, WASH_DAYS, slot_for_category
from app.background import remove_background
from PIL import Image, UnidentifiedImageError
from io import BytesIO
from datetime import datetime, timezone
from typing import Literal
import asyncio
import httpx
import os
import uuid
from urllib.parse import urlsplit, unquote


router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
# How many items each insights list shows
INSIGHTS_LIST_SIZE = 5

def is_allowed_image_url(url: str) -> bool:
    # Only fetch images from our own Supabase public storage
    allowed = urlsplit(SUPABASE_URL)
    parts = urlsplit(url)
    return (
        bool(allowed.netloc)
        and parts.scheme == allowed.scheme
        and parts.netloc == allowed.netloc
        and parts.path.startswith("/storage/v1/object/public/")
        and ".." not in unquote(parts.path)
    )

def get_owned_items(db: Session, user_id: int, item_ids: list[int]) -> list[ClothingItem]:
    """Every requested item, in the order asked for, or a 404 if any of them isn't this user's."""
    wanted = list(dict.fromkeys(item_ids))
    items = db.query(ClothingItem).filter(ClothingItem.id.in_(wanted), ClothingItem.user_id == user_id).all()
    if len(items) != len(wanted):
        raise HTTPException(status_code=404, detail="Item not found")
    items_by_id = {item.id: item for item in items}
    return [items_by_id[item_id] for item_id in wanted]

@router.post("/wear-today")
def wear_today(req: WearTodayRequest ,db: Session = Depends(get_db), user_id = Depends(get_current_user)):
    user = get_user(db=db, user_id=user_id)
    if not req.item_ids:
        raise HTTPException(status_code=400, detail="No items provided")

    now = datetime.now(timezone.utc)
    outfit_key = uuid.uuid4().hex
    for item in get_owned_items(db, user.id, req.item_ids):
        db.add(WearEvent(
            user_id=user.id,
            item_id=item.id,
            outfit_key=outfit_key,
            worn_at=now,
            previous_last_worn=item.last_worn_date,
        ))
        item.last_worn_date = now
    db.commit()
    return {"response": "Updated clothes worn today", "outfit_key": outfit_key, "status_code": 200}

@router.post("/undo-wear")
def undo_wear(req: UndoWearRequest, db: Session = Depends(get_db), user_id = Depends(get_current_user)):
    user = get_user(db=db, user_id=user_id)
    events = db.query(WearEvent).filter(WearEvent.outfit_key == req.outfit_key, WearEvent.user_id == user.id).all()
    if not events:
        raise HTTPException(status_code=404, detail="Outfit not found")

    for event in events:
        item = db.get(ClothingItem, event.item_id)
        # Leave the date alone if the item was washed or worn again since
        if item.last_worn_date == event.worn_at:
            item.last_worn_date = event.previous_last_worn
        db.delete(event)
    db.commit()
    return {"response": "Wear undone"}

@router.post("/wash")
def mark_washed(req: WashRequest, db: Session = Depends(get_db), user_id = Depends(get_current_user)):
    user = get_user(db=db, user_id=user_id)
    if not req.item_ids:
        raise HTTPException(status_code=400, detail="No items provided")
    for item in get_owned_items(db, user.id, req.item_ids):
        item.last_worn_date = None
    db.commit()
    return {"response": "Marked as washed"}

def flatten_on_white(image: Image.Image) -> Image.Image:
    # Dropping transparency outright leaves a black background, and the models
    # were trained on clothes photographed against pale ones
    rgba = image.convert("RGBA")
    background = Image.new("RGBA", rgba.size, "white")
    return Image.alpha_composite(background, rgba).convert("RGB")

async def process_single_url(url, user_db_id):
    try:
        async with httpx.AsyncClient() as client:
            reponse = await client.get(url=url)
        if reponse.status_code != 200:
            return None
        image = flatten_on_white(Image.open(BytesIO(reponse.content)))
    except (httpx.HTTPError, OSError):
        # One bad image should not fail the rest of the batch
        return None

    category_task = concurrency.run_in_threadpool(predict_category, image) 
    embedding_task = concurrency.run_in_threadpool(get_clip_embedding, image) 
    # Match the order of tasks to the variables
    embedding, category = await asyncio.gather(embedding_task, category_task)

    return {
        "category": str(category), # Ensure category is a string
        "embedding": embedding.tolist() if hasattr(embedding, 'tolist') else embedding, 
        "image_url": url,
        "user_id": user_db_id
    }

@router.post("/add-clothing")
async def add_item(req: ImageAddRequest, db: Session = Depends(get_db), user_id = Depends(get_current_user)):
    urls = req.imageUrls
    if not urls:
        raise HTTPException(status_code=400, detail="No images provided")
    if not all(is_allowed_image_url(url) for url in urls):
        raise HTTPException(status_code=400, detail="Image URL not allowed")
    user_id = (await concurrency.run_in_threadpool(get_user, db=db, user_id=user_id)).id
    tasks = [process_single_url(url, user_db_id=user_id) for url in urls]

    results = await asyncio.gather(*tasks)
    results = [r for r in results if r is not None]
    if not results:
        raise HTTPException(status_code=422, detail="None of the images could be processed")

    stmt = insert(ClothingItem.__table__).values(results)
    db.execute(statement=stmt)
    db.commit()

    return {"response":"Images created", "added": len(results), "failed": len(urls) - len(results), "status_code": 201}

@router.post("/remove-background")
async def remove_image_background(request: Request, user_id = Depends(get_current_user)):
    image_bytes = await request.body()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="No image provided")
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large")
    try:
        result = await concurrency.run_in_threadpool(remove_background, image_bytes)
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=422, detail="Not a readable image")
    return Response(content=result, media_type="image/png")

IN_WASH_SQL = "(last_worn_date IS NOT NULL AND last_worn_date > NOW() - make_interval(days => :wash_days))"

@router.get("/items")
def get_all_items(
    db: Session = Depends(get_db),
    user_id = Depends(get_current_user),
    status: Literal["all", "available", "laundry"] = "all",
    slot: str | None = None,
    limit: int = Query(default=24, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    user = get_user(db, user_id=user_id)
    if slot is not None and slot not in SLOT_CATEGORIES:
        raise HTTPException(status_code=400, detail="Unknown slot")

    params = {"user_id": user.id, "wash_days": WASH_DAYS}
    filters = "user_id = :user_id"
    if slot:
        filters += " AND category::int = ANY(:categories)"
        params["categories"] = SLOT_CATEGORIES[slot]

    # The tab counts cover the whole filter, not just the loaded page
    counts = db.execute(text(f"""
            SELECT COUNT(*) FILTER (WHERE {IN_WASH_SQL}) AS laundry,
                   COUNT(*) FILTER (WHERE NOT {IN_WASH_SQL}) AS available
            FROM clothing_items
            WHERE {filters}
        """), params).one()

    if status == "laundry":
        filters += f" AND {IN_WASH_SQL}"
        total = counts.laundry
    elif status == "available":
        filters += f" AND NOT {IN_WASH_SQL}"
        total = counts.available
    else:
        total = counts.laundry + counts.available

    # Embeddings are large and the frontend doesn't use them, so leave them out
    query = text(f"""
            SELECT id, name, image_url, category, last_worn_date, score, price, user_id,
                   {IN_WASH_SQL} AS in_wash
            FROM clothing_items
            WHERE {filters}
            ORDER BY id DESC
            LIMIT :limit OFFSET :offset
        """)
    results = db.execute(query, {**params, "limit": limit, "offset": offset}).fetchall()

    return {
        "results": [dict(image._mapping) for image in results],
        "total": total,
        "counts": {"available": counts.available, "laundry": counts.laundry},
        "status_code": 200,
    }

@router.patch("/items/{item_id}")
def update_item(item_id: int, req: ItemUpdateRequest, db: Session = Depends(get_db), user_id = Depends(get_current_user)):
    user = get_user(db, user_id=user_id)
    item = get_owned_items(db, user.id, [item_id])[0]
    changes = req.model_dump(exclude_unset=True)

    if "category" in changes:
        if changes["category"] is None or changes["category"] > MAX_CATEGORY:
            raise HTTPException(status_code=400, detail="Unknown category")
        changes["category"] = str(changes["category"])
    for field, value in changes.items():
        setattr(item, field, value)
    db.commit()
    return {"id": item.id, "name": item.name, "category": item.category, "price": item.price}

@router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db), user_id = Depends(get_current_user)):
    user = get_user(db, user_id=user_id)
    item = get_owned_items(db, user.id, [item_id])[0]
    db.delete(item)
    db.commit()
    return {"response": "Item deleted"}

def outfit_item(item: ClothingItem) -> dict:
    return {"id": item.id, "url": item.image_url, "category": item.category}

@router.get("/history")
def wear_history(
    db: Session = Depends(get_db),
    user_id = Depends(get_current_user),
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    user = get_user(db, user_id=user_id)
    outfits = db.execute(text("""
            SELECT outfit_key, MAX(worn_at) AS worn_at
            FROM wear_events
            WHERE user_id = :user_id
            AND worn_at >= COALESCE(CAST(:start AS timestamptz), '-infinity')
            AND worn_at < COALESCE(CAST(:end AS timestamptz), 'infinity')
            GROUP BY outfit_key
            ORDER BY worn_at DESC
            LIMIT :limit OFFSET :offset
        """), {"user_id": user.id, "start": start, "end": end, "limit": limit, "offset": offset}).fetchall()

    keys = [outfit.outfit_key for outfit in outfits]
    rows = (
        db.query(WearEvent.outfit_key, ClothingItem)
        .join(ClothingItem, ClothingItem.id == WearEvent.item_id)
        .filter(WearEvent.outfit_key.in_(keys))
        .order_by(WearEvent.id)
        .all()
    )
    items_by_outfit = {}
    for key, item in rows:
        items_by_outfit.setdefault(key, []).append(outfit_item(item))

    return {"results": [
        {"outfit_key": outfit.outfit_key, "worn_at": outfit.worn_at, "items": items_by_outfit.get(outfit.outfit_key, [])}
        for outfit in outfits
    ]}

@router.get("/saved-outfits")
def list_saved_outfits(db: Session = Depends(get_db), user_id = Depends(get_current_user)):
    user = get_user(db, user_id=user_id)
    outfits = db.query(SavedOutfit).filter(SavedOutfit.user_id == user.id).order_by(SavedOutfit.id.desc()).all()

    wanted = {item_id for outfit in outfits for item_id in outfit.item_ids}
    items = {
        item.id: item
        for item in db.query(ClothingItem).filter(ClothingItem.id.in_(wanted), ClothingItem.user_id == user.id)
    }

    # Deleted clothes drop out, and an outfit with nothing left isn't shown
    results = []
    for outfit in outfits:
        remaining = [outfit_item(items[item_id]) for item_id in outfit.item_ids if item_id in items]
        if remaining:
            results.append({"id": outfit.id, "name": outfit.name, "created_at": outfit.created_at, "items": remaining})
    return {"results": results}

@router.post("/saved-outfits")
def save_outfit(req: SaveOutfitRequest, db: Session = Depends(get_db), user_id = Depends(get_current_user)):
    user = get_user(db, user_id=user_id)
    get_owned_items(db, user.id, req.item_ids)
    outfit = SavedOutfit(user_id=user.id, name=req.name, item_ids=list(dict.fromkeys(req.item_ids)))
    db.add(outfit)
    db.commit()
    return {"id": outfit.id, "name": outfit.name}

@router.delete("/saved-outfits/{outfit_id}")
def delete_saved_outfit(outfit_id: int, db: Session = Depends(get_db), user_id = Depends(get_current_user)):
    user = get_user(db, user_id=user_id)
    outfit = db.query(SavedOutfit).filter(SavedOutfit.id == outfit_id, SavedOutfit.user_id == user.id).first()
    if outfit is None:
        raise HTTPException(status_code=404, detail="Outfit not found")
    db.delete(outfit)
    db.commit()
    return {"response": "Outfit deleted"}

@router.get("/insights")
def wardrobe_insights(db: Session = Depends(get_db), user_id = Depends(get_current_user)):
    user = get_user(db, user_id=user_id)
    rows = db.execute(text(f"""
            SELECT c.id, c.image_url, c.category, c.name, c.price, c.last_worn_date,
                   {IN_WASH_SQL} AS in_wash,
                   COUNT(w.id) AS wear_count
            FROM clothing_items c
            LEFT JOIN wear_events w ON w.item_id = c.id
            WHERE c.user_id = :user_id
            GROUP BY c.id
        """), {"user_id": user.id, "wash_days": WASH_DAYS}).fetchall()

    def summary(row):
        cost_per_wear = round(row.price / row.wear_count, 2) if row.price is not None and row.wear_count else None
        return {
            "id": row.id,
            "url": row.image_url,
            "category": row.category,
            "name": row.name,
            "price": row.price,
            "wear_count": row.wear_count,
            "cost_per_wear": cost_per_wear,
        }

    by_slot = {slot: 0 for slot in SLOT_CATEGORIES}
    for row in rows:
        slot = slot_for_category(row.category)
        if slot:
            by_slot[slot] += 1

    worn = [row for row in rows if row.wear_count]
    never_worn = [row for row in rows if not row.wear_count]
    priced = [row for row in worn if row.price is not None]

    return {
        "total_items": len(rows),
        "in_wash": sum(1 for row in rows if row.in_wash),
        "total_wears": sum(row.wear_count for row in rows),
        "by_slot": by_slot,
        "most_worn": [summary(row) for row in sorted(worn, key=lambda r: -r.wear_count)[:INSIGHTS_LIST_SIZE]],
        "least_worn": [summary(row) for row in sorted(worn, key=lambda r: r.wear_count)[:INSIGHTS_LIST_SIZE]],
        "never_worn": [summary(row) for row in never_worn[:INSIGHTS_LIST_SIZE]],
        "never_worn_count": len(never_worn),
        "best_value": [summary(row) for row in sorted(priced, key=lambda r: r.price / r.wear_count)[:INSIGHTS_LIST_SIZE]],
    }
