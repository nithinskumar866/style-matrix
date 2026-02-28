from fastapi import APIRouter, Depends, concurrency
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


router = APIRouter()

@router.post("/wear-today")
def wear_today(req: WearTodayRequest ,db: Session = Depends(get_db), user_id = Depends(get_current_user)):
    user = get_user(db=db, user_id=user_id)
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
    async with httpx.AsyncClient() as client:
        reponse = await client.get(url=url)
        if reponse.status_code != 200: 
            return None
    
    image = Image.open(BytesIO(reponse.content)).convert("RGB")
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
    user_id = (await concurrency.run_in_threadpool(get_user, db=db, user_id=user_id)).id
    tasks = [process_single_url(url, user_db_id=user_id) for url in urls]
    
    results = await asyncio.gather(*tasks)
    results = [r for r in results if r is not None]
    stmt = insert(ClothingItem.__table__).values(results)
    db.execute(statement=stmt)
    db.commit()
    
    return {"response":"Images created", "status_code": 201}

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