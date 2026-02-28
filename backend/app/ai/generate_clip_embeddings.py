from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import torch
import os
import pandas as pd
from tqdm import tqdm

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

clip_model_id = "patrickjohncyh/fashion-clip"
processor = CLIPProcessor.from_pretrained(clip_model_id)
model = CLIPModel.from_pretrained(clip_model_id).to(DEVICE)
model.eval()

data_path = os.path.join("..", "..", "data", "polyvore")
df = pd.read_csv(os.path.join(data_path, "items.csv"))

image_paths = df["image_path"].tolist()

batch_size = 64
embeddings = {}

for i in tqdm(range(0, len(image_paths), batch_size)):
    batch_paths = image_paths[i:i+batch_size]

    images = []
    valid_paths = []

    for path in batch_paths:
        try:
            img = Image.open(path).convert("RGB")
            images.append(img)
            valid_paths.append(path)
        except:
            continue

    if len(images) == 0:
        continue

    inputs = processor(images=images, return_tensors="pt").to(DEVICE)

    with torch.no_grad():
        # 1. Get the features
        outputs = model.get_image_features(pixel_values=inputs["pixel_values"])
        
        # 2. Extract the tensor if it's wrapped in a BaseModelOutput object
        # If outputs is already a tensor, this won't hurt.
        emb = outputs.pooler_output if hasattr(outputs, 'pooler_output') else outputs
        
        # 3. Normalize for cosine similarity
        emb = emb / emb.norm(dim=-1, keepdim=True)
        
    for j, path in enumerate(valid_paths):
        embeddings[path] = emb[j].cpu().numpy()   # store as numpy (important)

torch.save(embeddings, os.path.join(data_path, "fashion_clip_embeddings.pt"))
print("Saved:", len(embeddings))