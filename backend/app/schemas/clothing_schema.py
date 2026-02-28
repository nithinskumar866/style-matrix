from typing import Optional, List

from pydantic import BaseModel

class ImageAddRequest(BaseModel):
    imageUrls: List[str]
    
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
    
    class Config: 
        form_attributes = True