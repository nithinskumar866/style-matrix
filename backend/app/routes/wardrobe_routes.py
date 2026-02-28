from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.crud import add_clothing_item
from app.schemas.clothing_schema import ClothingCreate, ClothingResponse, ImageAddRequest
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


router = APIRouter()

@router.post("/add-clothing")
def add_item(req: ImageAddRequest, db: Session = Depends(get_db), user_id = Depends(get_current_user)):
    urls = req.imageUrls
    print("recieved reci")
    info = []
    for url in urls:
        image_dict = {}
        imageResponse = requests.get(url)
        image = Image.open(BytesIO(imageResponse.content)).convert("RGB")
        
        # resnet
        image_dict["category"] = predict_category(image)
        # clip
        image_dict["embedding"] = get_clip_embedding(image)
        
        image_dict["image_url"] = url
        image_dict["user_id"] = get_user(db=db, user_id=user_id).id
        info.append(image_dict)
    
    stmt = insert(ClothingItem.__table__).values(info)
    db.execute(statement=stmt)
    db.commit()
    
    return {"response":"Images created", "status_code": 200}

@router.get("/items")
def get_all_items(db: Session = Depends(get_db), user_id = Depends(get_current_user)):
    user = get_user(db, user_id=user_id)
    return db.query(ClothingItem).filter(ClothingItem.user_id == user.id).all()