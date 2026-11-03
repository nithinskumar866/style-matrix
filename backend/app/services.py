from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
import os
import requests
import time
from jose.exceptions import JWTError, ExpiredSignatureError
from sqlalchemy.orm import Session
from transformers import CLIPProcessor, CLIPModel 
import torch 
from app.ai.config import DEVICE
from sqlalchemy import text
from app.crud import get_user
from app.database import get_db
from app.outfit_rules import SLOT_RANGES, slots_for_prompt
from app.util import parse_pgvector , vector_to_pgvector
from app.ai.recommendation.compatibility_model import CompatibilityModel
from itertools import product


compatibility_model = CompatibilityModel().to(DEVICE)
compatibility_model.eval()  # important for inference

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(BASE_DIR, "..", "data", "polyvore")
compatibility_model.load_state_dict(
    torch.load(os.path.join(data_path, "compatibility_model.pth"), map_location=DEVICE, weights_only=True)
)
CLIP_MODEL_ID = "patrickjohncyh/fashion-clip"
processor = CLIPProcessor.from_pretrained(CLIP_MODEL_ID)
clip_model = CLIPModel.from_pretrained(CLIP_MODEL_ID).to(DEVICE)
clip_model.eval()

security = HTTPBearer()
SUPABASE_URL = os.getenv("SUPABASE_URL")

JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
JWKS_CACHE_SECONDS = 600
# An unknown key ID can mean the keys were rotated, but limit refetches so
# tokens with made-up key IDs can't trigger a request every time
JWKS_MIN_REFETCH_SECONDS = 60
jwks_cache = {"keys": [], "fetched_at": 0.0}

def fetch_jwks():
    response = requests.get(JWKS_URL, timeout=5)
    response.raise_for_status()
    keys = response.json().get("keys")
    if not keys:
        raise Exception("JWKS does not contain 'keys'")
    jwks_cache["keys"] = keys
    jwks_cache["fetched_at"] = time.monotonic()

def find_key(kid):
    return next((key for key in jwks_cache["keys"] if key["kid"] == kid), None)

def get_public_key(token):
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")

    age = time.monotonic() - jwks_cache["fetched_at"]
    if not jwks_cache["keys"] or age > JWKS_CACHE_SECONDS:
        fetch_jwks()

    key = find_key(kid)
    if key is None and time.monotonic() - jwks_cache["fetched_at"] > JWKS_MIN_REFETCH_SECONDS:
        fetch_jwks()
        key = find_key(kid)

    if key is None:
        raise Exception("Public key not found")
    return key

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try: 
        key = get_public_key(token=token)
        payload = jwt.decode(token, key, algorithms=["ES256"], audience="authenticated", issuer=f"{SUPABASE_URL}/auth/v1")
    except ExpiredSignatureError:
        print("JWT ERROR: Token expired")
        raise HTTPException(status_code=401, detail="Token expired")

    except JWTError as e:
        print("JWT ERROR:", str(e))   # ← check console
        raise HTTPException(status_code=401, detail="Invalid token")

    except Exception as e:
        print("AUTH ERROR:", str(e))
        raise HTTPException(status_code=401, detail="Authentication failed")

    user_id = payload.get("sub")
    return user_id

# How much the text prompt counts in an outfit's score, next to compatibility
PROMPT_WEIGHT = 0.4
# Text-to-image similarity rarely exceeds this, so treat it as a full prompt match
MAX_PROMPT_SIMILARITY = 0.4

def to_unit_tensor(embedding):
    tensor = torch.tensor(embedding).view(1, -1).float().to(DEVICE)
    return tensor / tensor.norm(dim=-1, keepdim=True)

def prompt_score(item):
    return max(0.0, min(float(item.similarity) / MAX_PROMPT_SIMILARITY, 1.0))

def get_top_compatible_outfits(outfit_candidates, model, embeddings_cache):
    combinations = []

    # 1️⃣ Handle top+bottom combos
    tb_combos = list(product(
        outfit_candidates.get("top", []),
        outfit_candidates.get("bottom", [])
    ))

    for top, bottom in tb_combos:
        e_top = embeddings_cache.get(top.image_url)
        e_bottom = embeddings_cache.get(bottom.image_url)
        if e_top is None or e_bottom is None:
            continue

        t_top = to_unit_tensor(e_top)
        t_bottom = to_unit_tensor(e_bottom)

        # The model was trained on pairs in both orders, so average them
        with torch.no_grad():
            compatibility = (model(t_top, t_bottom).item() + model(t_bottom, t_top).item()) / 2

        prompt = (prompt_score(top) + prompt_score(bottom)) / 2
        score_tb = (1 - PROMPT_WEIGHT) * compatibility + PROMPT_WEIGHT * prompt

        combinations.append({
            "score": score_tb,
            "outfit": {
                "top": {"id": top.id, "url": top.image_url},
                "bottom": {"id": bottom.id, "url": bottom.image_url},
            }
        })

    # 2️⃣ Handle full-body items separately
    for full in outfit_candidates.get("full", []):
        e_full = embeddings_cache.get(full.image_url)
        if e_full is None:
            continue

        # A single piece has nothing to pair with, so only the prompt applies
        score_full = prompt_score(full)

        combinations.append({
            "score": score_full,
            "outfit": {
                "fullbody": {"id": full.id, "url": full.image_url}
            }
        })

    # 3️⃣ Sort and return top 5
    combinations.sort(key=lambda x: x["score"], reverse=True)
    return combinations[:5]

def suggest_outfit_from_text(prompt: str, db: Session, user_id: str):
    user = get_user(db, user_id)

    # 1. Encode the text prompt
    text_inputs = processor(text=[prompt], return_tensors="pt", padding=True).to(DEVICE)
    
    with torch.no_grad():
        outputs = clip_model.get_text_features(**text_inputs)

    # Handle HuggingFace FashionCLIP output
    if hasattr(outputs, "pooler_output"):
        text_features = outputs.pooler_output
    elif isinstance(outputs, torch.Tensor):
        text_features = outputs
    else:
        text_features = outputs[0]

    # Normalize
    text_features = text_features / text_features.norm(dim=-1, keepdim=True)

    # Convert to list (NO flatten)
    text_vector = text_features[0].cpu().numpy().tolist()

    # 2. Get Candidates
    outfit_candidates = {}
    local_embeddings_cache = {} # This will store the vectors for the scorer

    for slot in slots_for_prompt(prompt):
        # Note: Added category filter back in so 'top' doesn't return 'shoes'
        query = text("""
            SELECT
                id,
                image_url,
                category,
                embedding,
                (1 - (embedding <=> :text_emb)) as similarity
            FROM clothing_items
            WHERE user_id = :user_id
            AND category::int BETWEEN :start AND :end
            -- Items in the wash stay out of suggestions, matching the wardrobe page
            AND (last_worn_date IS NULL OR last_worn_date <= NOW() - INTERVAL '5 days')
            ORDER BY similarity DESC
            LIMIT 5
        """)
        
        results = db.execute(query, {
            "text_emb": vector_to_pgvector(text_vector), 
            "user_id": user.id,
            "start": SLOT_RANGES[slot][0],
            "end": SLOT_RANGES[slot][1],
        }).fetchall()

        outfit_candidates[slot] = results
        
        # Fill the cache with the 512-dim vectors from the DB
        for row in results:
            local_embeddings_cache[row.image_url] = parse_pgvector(row.embedding)

    # 3. Use the Compatibility Model
    outfits = get_top_compatible_outfits(
        outfit_candidates=outfit_candidates,
        model=compatibility_model,
        embeddings_cache=local_embeddings_cache # Pass the freshly pulled vectors
    )
    
    return outfits