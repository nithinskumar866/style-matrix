# from fastapi import FastAPI
# from .database import Base, engine
# from .routes import wardrobe_routes, recommendation_routes, feedback_routes, user_routes


# app = FastAPI(title="Style Matrix API")

# app.include_router(wardrobe_routes.router, prefix="/wardrobe", tags=["Wardrobe"])
# app.include_router(recommendation_routes.router, prefix="/recommendation_routes", tags=["recommendation_routes"])
# app.include_router(feedback_routes.router, prefix="/feedback_routes", tags=["feedback_routes"])
# app.include_router(user_routes.router, prefix="/user_routes", tags=["user_routes"])


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routes import wardrobe_routes, recommendation_routes, feedback_routes, user_routes

app = FastAPI(title="Style Matrix API")

# 1. ADD CORS MIDDLEWARE
# This allows your React frontend (port 5173) to talk to your FastAPI backend (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. UPDATE ROUTE PREFIXES
# Your frontend AppContext expects routes to start with "/api"
app.include_router(wardrobe_routes.router, prefix="/api/wardrobe", tags=["Wardrobe"])
app.include_router(recommendation_routes.router, prefix="/api/recommendation", tags=["Recommendation"])
app.include_router(feedback_routes.router, prefix="/api/feedback", tags=["Feedback"])

# This prefix is changed to "/api" so that user_routes.py can handle "/user-profile"
app.include_router(user_routes.router, prefix="/api", tags=["User Profile"])