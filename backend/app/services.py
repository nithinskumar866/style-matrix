from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
import os
import requests

security = HTTPBearer()
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")

JWKS_URL = f"{SUPABASE_URL}/auth/v1/keys"
jwks = requests.get(JWKS_URL).json()
algorithm = "ES256"

def get_public_key(token):
    headers = jwt.get_unverified_header(token)
    kid = headers['kid']
    for key in jwks['keys']:
        if key["kid"] == kid:
            return key
    raise HTTPException(status_code=401, detail="Public key not found") 

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    
    try: 
        key = get_public_key(token=token)
        payload = jwt.decode(token, key, algorithms=["ES256"], audience="authenticated", issuer=f"{SUPABASE_URL}/auth/v1")
    except Exception as e: 
        raise HTTPException(status_code=401, detail=f"invalid token {str(e)}")
    user_id = payload.get("sub")
    return user_id
# replace with pytorch ai model 
# - recommendation service 
# - embedding service
# - ranking service
# - feedback service
import random


def rank_candidates(candidates):
    scored = []
    for c in candidates:
        score = random.random()
        scored.append({"outfit": c, "score": score})

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored

def generate_candidates(items):
    tops = [i for i in items if i.category == "top"]
    bottoms = [i for i in items if i.category == "bottom"]

    candidates = []
    for t in tops:
        for b in bottoms:
            candidates.append([t.id, b.id])

    return candidates

