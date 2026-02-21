from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas import user_schema
from app.database import get_db
from app.crud import create_user
from services import get_current_user
router = APIRouter()

@router.post("/", response_model=user_schema.UserResponse)
def create_user(user: user_schema.UserCreate, user_id: str = Depends(get_current_user),db: Session = Depends(get_db)):
    return create_user(db, user)