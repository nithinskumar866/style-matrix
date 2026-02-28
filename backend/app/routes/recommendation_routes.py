from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.services import get_current_user, suggest_outfit_from_text
from app.database import get_db
from app.models import User
router = APIRouter()

@router.get("/recommend")
def get_recommendation(db: Session = Depends(get_db), prompt: str = "", user: str  = Depends(get_current_user)):
    outfits = suggest_outfit_from_text(prompt=prompt, user_id=user, db=db)
    return {"recommendations": outfits, "status_code": 200}
