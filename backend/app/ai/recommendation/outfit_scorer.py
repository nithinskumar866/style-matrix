import torch
import torch.nn as nn
import os
from compatibility_model import CompatibilityModel

data_path = os.path.join("..", "..", "..", "data", "polyvore")

# Load embeddings
embeddings = torch.load(os.path.join(data_path, "fashion_clip_embeddings.pt"))
# Load embeddings
raw_embeddings = torch.load(os.path.join(data_path, "fashion_clip_embeddings.pt"), weights_only=False)

# Flatten the keys: "C:\Users\...\373947_1.jpg" -> "373947_1.jpg"
embeddings = {os.path.basename(k): v for k, v in raw_embeddings.items()}

print(f"Sanitized {len(embeddings)} keys. Example key: {list(embeddings.keys())[0]}")
print("Sample keys:")
for i, k in enumerate(embeddings.keys()):
    print(k)
    if i == 5:
        break
# Load trained model
model = CompatibilityModel()
model.load_state_dict(torch.load(os.path.join(data_path, "compatibility_model.pth"), map_location="cpu"))
model.eval()

search_id = "373947"
matches = [k for k in embeddings.keys() if search_id in k]
print(f"Search results for {search_id}: {matches}")
def pair_score(img1_path, img2_path):
    # Search for any key containing '373947'
    # Get just the filename from the path
    name1 = os.path.basename(img1_path)
    name2 = os.path.basename(img2_path)

    if name1 not in embeddings or name2 not in embeddings:
        print(f"⚠️ Still missing from dictionary: {name1} or {name2}")
        return 0.0

    e1 = embeddings[name1]
    e2 = embeddings[name2]

    # Convert NumPy to Tensor and add batch dimension
    e1_t = torch.from_numpy(e1).unsqueeze(0).float()
    e2_t = torch.from_numpy(e2).unsqueeze(0).float()

    with torch.no_grad():
        score = model(e1_t, e2_t)

    return score.item()

# -------- Outfit score --------
def outfit_score(image_list):
    """
    image_list = [
        "images/214181831_1.jpg",
        "images/214181831_2.jpg",
        "images/214181831_3.jpg"
    ]
    """
    total = 0
    count = 0

    for i in range(len(image_list)):
        for j in range(i + 1, len(image_list)):
            total += pair_score(image_list[i], image_list[j])
            count += 1

    if count == 0:
        return 0

    return total / count