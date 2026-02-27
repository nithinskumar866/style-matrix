from fastapi import APIRouter
from fastapi import Depends
from app.services import get_current_user
router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("/")
def feedback(outfit: str, liked: bool, user_id: str = Depends(get_current_user)):
    # Later: update user embedding
    return {"message": "Feedback recorded"}