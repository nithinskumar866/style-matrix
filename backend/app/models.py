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


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    image_url = Column(String)
    category = Column(String)

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