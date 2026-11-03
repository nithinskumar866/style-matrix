from pydantic import BaseModel
from typing import Optional, List

class UserBase(BaseModel):
    gender: Optional[str] = None
    body_type: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    skin_tone: Optional[str] = None
    
class UserCreate(UserBase):
    id: str

class UserResponse(UserBase):
    id: str
    
    class Config: 
        form_attributes = True
        