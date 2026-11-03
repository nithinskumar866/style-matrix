from fastapi import APIRouter, Depends, HTTPException, concurrency
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.crud import add_clothing_item
from app.schemas.clothing_schema import ImageAddRequest, WearTodayRequest
from app.database import get_db
from app.services import get_current_user
from typing import List
from app.util import predict_category, get_clip_embedding
from app.crud import get_user
import requests
from sqlalchemy import insert
from app.models import ClothingItem
from PIL import Image
from io import BytesIO
from datetime import date
import asyncio
import httpx
import os
from urllib.parse import urlsplit, unquote


router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")

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

@router.post("/wear-today")
def wear_today(req: WearTodayRequest ,db: Session = Depends(get_db), user_id = Depends(get_current_user)):
    user = get_user(db=db, user_id=user_id)
    if not req.item_ids:
        raise HTTPException(status_code=400, detail="No items provided")

    owned_ids = {
        row.id for row in db.query(ClothingItem.id).filter(
            ClothingItem.id.in_(req.item_ids),
            ClothingItem.user_id == user.id,
        )
    }
    if owned_ids != set(req.item_ids):
        raise HTTPException(status_code=404, detail="Item not found")

    today = date.today()
    updates = [
        {
            "id": item_id,
            "last_worn_date": today
        }
        for item_id in req.item_ids
    ]
    db.bulk_update_mappings(ClothingItem, updates)
    db.commit()
    return {"response": "Updated clothes worn today", "status_code": 200}

async def process_single_url(url, user_db_id):
    try:
        async with httpx.AsyncClient() as client:
            reponse = await client.get(url=url)
        if reponse.status_code != 200:
            return None
        image = Image.open(BytesIO(reponse.content)).convert("RGB")
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

@router.get("/items")
def get_all_items(db: Session = Depends(get_db), user_id = Depends(get_current_user), count: int = 10):
    user = get_user(db, user_id=user_id)
    print(user.id)
    query = text("""
            SELECT *
            FROM clothing_items 
            WHERE user_id = :user_id
            LIMIT :count
        """)
    results = db.execute(
        query, 
        {
            "count": count,
            "user_id": user.id 
        }
    ).fetchall()

    return {"results": [dict(image._mapping)
        for image in results], "status_code": 200}