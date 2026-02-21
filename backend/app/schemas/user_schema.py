from pydantic import BaseModel
from typing import Optional, List

class UserBase(BaseModel):
    gender: str
    body_type: Optional[str]
    height: Optional[float]
    weight: Optional[float]
    skin_tone: Optional[str]
    
class UserCreate(UserBase):
    id: str

class UserResponse(UserBase):
    id: str
    
    class Config: 
        form_attributes = True
        