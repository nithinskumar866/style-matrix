from sqlalchemy.orm import Session
from .models import User, ClothingItem
from app.schemas.clothing_schema import ClothingCreate

def create_user(db: Session, user_data): 
    user = User(**user_data.dict())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user(db: Session, user_id: str):
    return db.query(User).filter(User.id==user_id).first()

def add_clothing_item(db: Session, item_data: ClothingCreate, user_id):
    item = ClothingItem(**item_data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item 

def get_user_items(db: Session, user_id: str):
    return db.query(ClothingItem).filter(ClothingItem.user_id == user_id).all()