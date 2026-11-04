from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud import get_user
from app.database import get_db
from app.models import ClothingItem, Feedback
from app.schemas.clothing_schema import FeedbackRequest
from app.services import get_current_user
router = APIRouter()


@router.post("/")
def feedback(req: FeedbackRequest, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    user = get_user(db, user_id)
    item_ids = sorted(set(req.item_ids))

    owned = db.query(ClothingItem.id).filter(ClothingItem.id.in_(item_ids), ClothingItem.user_id == user.id).count()
    if owned != len(item_ids):
        raise HTTPException(status_code=404, detail="Item not found")

    # Changing your mind replaces the earlier reaction to the same outfit
    for row in db.query(Feedback).filter(Feedback.user_id == user.id):
        if sorted(row.items or []) == item_ids:
            db.delete(row)

    db.add(Feedback(
        user_id=user.id,
        items=item_ids,
        interaction_type="like" if req.liked else "dislike",
        reward=1.0 if req.liked else -1.0,
        occasion=req.occasion,
        predicted_score=req.predicted_score,
    ))
    db.commit()
    return {"message": "Feedback recorded"}
