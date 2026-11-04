from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class ImageAddRequest(BaseModel):
    imageUrls: List[str]
    
class ItemUpdateRequest(BaseModel):
    category: Optional[int] = Field(default=None, ge=0)
    name: Optional[str] = Field(default=None, max_length=100)
    price: Optional[float] = Field(default=None, ge=0)

class WashRequest(BaseModel):
    item_ids: List[int]

class UndoWearRequest(BaseModel):
    outfit_key: str

class SaveOutfitRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    item_ids: List[int] = Field(min_length=1)

class WearTodayRequest(BaseModel):
    item_ids: List[int]
        
class ClothingBase(BaseModel):
    category: str
    image_url: str
    
class ClothingCreate(ClothingBase):
    user_id: str
    embedding: List[float]

class ClothingResponse(ClothingBase):
    id: int
    user_id: str
    last_worn_date: Optional[datetime] = None # <-- ADD THIS LINE
    
    class Config: 
        form_attributes = True

class Weather(BaseModel):
    temperature: Optional[float] = None
    condition: Optional[str] = None

class StyleProfile(BaseModel):
    gender: Optional[str] = None
    body_type: Optional[str] = None
    skin_tone: Optional[str] = None
    height: Optional[float] = None

class RecommendRequest(BaseModel):
    prompt: str = Field(default="", max_length=500)
    weather: Optional[Weather] = None
    profile: Optional[StyleProfile] = None

class FeedbackRequest(BaseModel):
    item_ids: List[int] = Field(min_length=1)
    liked: bool
    occasion: Optional[str] = Field(default=None, max_length=500)
    predicted_score: Optional[float] = None
