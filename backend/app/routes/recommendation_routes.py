from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from services import generate_candidates, rank_candidates
from app.database import get_db
from app.crud import get_user_items
router = APIRouter()

@router.get("/recommend/{user_id}")
def get_recommendation(user_id: str, db: Session = Depends(get_db)):
    items = get_user_items(db, user_id=user_id)
    candidates = generate_candidates(items)
    ranked = rank_candidates(items)
    return {"recommendations": ranked[:5]}
