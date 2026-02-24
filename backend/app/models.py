from sqlalchemy import Column, ForeignKey, Integer, String, Float, DateTime, JSON
from .database import Base
from pgvector.sqlalchemy import Vector
from datetime import datetime, timezone
from sqlalchemy.orm import relationship

class ClothingItem(Base):
    __tablename__ = "clothing_items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    category = Column(String)
    color = Column(String)
    season = Column(String)
    gender = Column(String)
    image_path = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="clothing_items")
    embedding = Column(Vector)
    attribute_links = relationship("ClothingItemAttribute", back_populates="clothing_item")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, unique=True)

    gender = Column(String, nullable=True)
    body_type = Column(String, nullable=True)
    height = Column(Float, nullable=True)
    weight = Column(Float, nullable=True)
    skin_tone = Column(String, nullable=True)

    clothing_items = relationship(
    "ClothingItem",
    back_populates="user",
    cascade="all, delete-orphan"
)
    feedbacks = relationship("Feedback", back_populates="user", 
    cascade="all, delete-orphan")
    

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True)

    # Supabase user id (UUID string)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)

    # Outfit that was recommended
    # outfit_id = Column(String, ForeignKey("outfits.id"), nullable=True)

    # If outfit not stored, store items directly
    items = Column(JSON, nullable=True)

    # Interaction type
    # view / like / dislike / save / skip
    interaction_type = Column(String, nullable=False)

    # Numerical reward for RL
    reward = Column(Float, nullable=False)

    # Context (state)
    weather = Column(String, nullable=True)
    occasion = Column(String, nullable=True)
    time_of_day = Column(String, nullable=True)

    # Optional: model score when shown
    predicted_score = Column(Float, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="feedbacks")

class Attributes(Base):
    __tablename__ = "attributes"
    id = Column(Integer, primary_key = True)
    name = Column(String)
    item_links = relationship("ClothingItemAttribute", back_populates="attribute")

class ClothingItemAttribute(Base):
    __tablename__ = "clothing_item_attributes"

    clothing_item_id = Column(
        Integer,
        ForeignKey("clothing_items.id", ondelete="CASCADE"),
        primary_key=True
    )
    attribute_id = Column(
        Integer,
        ForeignKey("attributes.id", ondelete="CASCADE"),
        primary_key=True
    )

    # Optional relationships to access the related objects easily
    clothing_item = relationship("ClothingItem", back_populates="attribute_links")
    attribute = relationship("Attribute", back_populates="item_links")