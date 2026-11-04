from sqlalchemy import Column, ForeignKey, Integer, String, Float, DateTime, JSON
from .database import Base
from pgvector.sqlalchemy import Vector
from datetime import datetime, timezone
from sqlalchemy.orm import relationship
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, unique=True)  # external ID

    clothing_items = relationship(
        "ClothingItem",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    feedbacks = relationship(
        "Feedback",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    wear_events = relationship(
        "WearEvent",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    saved_outfits = relationship(
        "SavedOutfit",
        back_populates="user",
        cascade="all, delete-orphan"
    )


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    last_worn_date = Column(DateTime(timezone=True), nullable=True)
    score = Column(Float, default=1.0)
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    image_url = Column(String)
    category = Column(String)
    price = Column(Float, nullable=True)

    user_id = Column(Integer, ForeignKey("users.id"))   # INTEGER FK
    user = relationship("User", back_populates="clothing_items")

    embedding = Column(Vector(512))


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # INTEGER FK
    user = relationship("User", back_populates="feedbacks")

    items = Column(JSON, nullable=True)
    interaction_type = Column(String, nullable=False)
    reward = Column(Float, nullable=False)
    weather = Column(String, nullable=True)
    occasion = Column(String, nullable=True)
    time_of_day = Column(String, nullable=True)
    predicted_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class WearEvent(Base):
    """One item worn at one time. Items worn together share an outfit_key."""
    __tablename__ = "wear_events"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="wear_events")

    item_id = Column(Integer, ForeignKey("clothing_items.id", ondelete="CASCADE"), nullable=False, index=True)
    outfit_key = Column(String, nullable=False, index=True)
    worn_at = Column(DateTime(timezone=True), nullable=False)
    # Lets a mistaken "wear today" be undone without losing the earlier date
    previous_last_worn = Column(DateTime(timezone=True), nullable=True)


class SavedOutfit(Base):
    __tablename__ = "saved_outfits"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="saved_outfits")

    name = Column(String, nullable=False)
    item_ids = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
