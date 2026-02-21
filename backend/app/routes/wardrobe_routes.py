from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.crud import add_clothing_item
from app.schemas.clothing_schema import ClothingCreate, ClothingResponse
from app.database import get_db
from services import get_current_user

router = APIRouter()

@router.post("/add-clothing", response_model=ClothingResponse)
def add_item(item: ClothingCreate, db: Session = Depends(get_db), user_id = Depends(get_current_user)):
    return add_clothing_item(db, item, user_id)