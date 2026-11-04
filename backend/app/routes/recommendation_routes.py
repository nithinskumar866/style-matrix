from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.clothing_schema import RecommendRequest
from app.services import get_current_user, suggest_outfit_from_text
from app.database import get_db
router = APIRouter()

# POST so that body details stay out of URLs and server logs
@router.post("/recommend")
def get_recommendation(req: RecommendRequest, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    outfits = suggest_outfit_from_text(
        prompt=req.prompt,
        user_id=user,
        db=db,
        weather=req.weather.model_dump() if req.weather else None,
        profile=req.profile.model_dump() if req.profile else None,
    )
    return {"recommendations": outfits, "status_code": 200}
