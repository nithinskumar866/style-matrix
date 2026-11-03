from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
import os
import re
import requests
from jose.exceptions import JWTError, ExpiredSignatureError
from sqlalchemy.orm import Session
from transformers import CLIPProcessor, CLIPModel 
import torch 
from app.ai.config import DEVICE
from sqlalchemy import text
from app.crud import get_user
from app.database import get_db
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
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")

JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
jwks = requests.get(JWKS_URL).json()
algorithm = "ES256"

def get_public_key(token):
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")

    # Fetch JWKS
    response = requests.get(JWKS_URL)
    jwks = response.json()
    keys = jwks.get("keys")
    if not keys:
        raise Exception("JWKS does not contain 'keys'")

    # Find matching key
    for key in keys:
        if key["kid"] == kid:
            return key

    raise Exception("Public key not found")

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
        freshness = min(float(top.freshness), float(bottom.freshness))
        score_tb = ((1 - PROMPT_WEIGHT) * compatibility + PROMPT_WEIGHT * prompt) * freshness

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

        # A single piece has nothing to pair with, so only the prompt and freshness apply
        score_full = prompt_score(full) * float(full.freshness)

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
    print("user id", user.id)
    
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

    print("Text dim:", len(text_vector))

    # 2. Get Candidates
    full_body_keywords = ["dress", "jumpsuit", "romper", "onesie", "kaftan", "sundress"]
    if re.search(r"\b(" + "|".join(full_body_keywords) + r")(es|s)?\b", prompt.lower()):
        slots = ["full"]
    else:
        slots = ["top", "bottom"]
    outfit_candidates = {}
    local_embeddings_cache = {} # This will store the vectors for the scorer
    print("Text dim:", len(text_vector))

    slotMapping = {
        "top": (0, 19),
        "bottom": (20, 35),
        "full": (36, 49),
    }
    for slot in slots:
        # Note: Added category filter back in so 'top' doesn't return 'shoes'
        query = text("""
            WITH scored_items AS(
                SELECT 
                    id,
                    image_url, 
                    category, 
                    embedding, 
                    COALESCE(EXTRACT(DAY FROM (NOW() - last_worn_date)), 100) as last_worn_days, 
                    (1 - (embedding <=> :text_emb)) as similarity
                FROM clothing_items
                WHERE user_id = :user_id
                AND category::int BETWEEN :start AND :end
            )
            SELECT id, image_url, category, similarity, embedding,
            (1.0 / GREATEST(1.0, 5.0 - last_worn_days)) as freshness,
            (GREATEST(similarity, 0) * (1.0 / GREATEST(1.0, 5.0 - last_worn_days))) as final_rank_score
            FROM scored_items
            ORDER BY final_rank_score DESC
            LIMIT 5 
        """)
        
        results = db.execute(query, {
            "text_emb": vector_to_pgvector(text_vector), 
            "user_id": user.id,
            "start": slotMapping[slot][0],
            "end": slotMapping[slot][1],
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