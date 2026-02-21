from fastapi import FastAPI
from .database import Base, engine
from .routes import wardrobe_routes, recommendation_routes, feedback_routes, user_routes


app = FastAPI(title="Style Matrix API")

app.include_router(wardrobe_routes.router, prefix="/wardrobe", tags=["Wardrobe"])
app.include_router(recommendation_routes.router, prefix="/recommendation_routes", tags=["recommendation_routes"])
app.include_router(feedback_routes.router, prefix="/feedback_routes", tags=["feedback_routes"])
app.include_router(user_routes.router, prefix="/user_routes", tags=["user_routes"])