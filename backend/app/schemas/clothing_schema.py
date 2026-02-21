from typing import Optional

from pydantic import BaseModel

class ClothingBase(BaseModel):
    category: str                  # top, bottom, outerwear, dress
    color: str                     # primary color
    pattern: Optional[str] = None  # solid, striped, checked, etc.
    fabric: Optional[str] = None   # cotton, denim, wool (user input)
    season: Optional[str] = None   # summer, winter, all-season
    occasion: Optional[str] = None # casual, formal, party
    image_path: str
    
class ClothingCreate(ClothingBase):
    user_id: str 

class ClothingResponse(ClothingBase):
    id: int
    user_id: str
    
    class Config: 
        form_attributes = True