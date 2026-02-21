from pydantic import BaseModel
from typing import Optional, List

class FeedbackCreate(BaseModel):
    user_id: str
    outfit_id: Optional[str]
    items: Optional[List[str]]
    interaction_type: str
    weather: Optional[str]
    occasion: Optional[str]
    time_of_day: Optional[str]
    predicted_score: Optional[float]

class FeedbackResponse(BaseModel):
    id: str
    reward: float

    class Config:
        from_attributes = True