import json
import os
import pandas as pd

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join("..", "..", "..", "data", "polyvore")
images_folder = os.path.join(data_path, "images")
category_file = os.path.join(data_path, "category_id.txt")
category_map = {}
with open(category_file, "r") as f:
    for line in f:
        cid, name = line.strip().split(" ", 1)
        category_map[int(cid)] = name.lower()

# Map to model categories
model_category_map = {
    "tops": "top",
    "shirts": "top",
    "blouse": "top",
    "pants": "bottom",
    "jeans": "bottom",
    "skirts": "bottom",
    "dresses": "full_body",
    "jackets": "outerwear",
    "coats": "outerwear",
    "shoes": "shoes",
    "sneakers": "shoes",
}

def map_category(cat_name):
    return model_category_map.get(cat_name, "other")

# Load JSON splits
splits = ["train.json", "valid.json", "test.json"]
items = []

for split in splits:
    with open(os.path.join(data_path, split), "r") as f:
        outfits = json.load(f)
        for outfit in outfits:
            outfit_id = outfit["set_id"]
            for item in outfit["items"]:
                img_name = f"{outfit_id}_{item['index']}.jpg"
                img_path = os.path.join(images_folder, img_name)
                if os.path.exists(img_path):
                    cat_name = category_map[item["categoryid"]]
                    cat_mapped = map_category(cat_name)
                    items.append({
                        "image_path": os.path.abspath(img_path),  # absolute path
                        "category": cat_mapped,
                        "outfit_id": outfit_id
                    })

# Save CSV
df = pd.DataFrame(items)
df.to_csv(os.path.join(data_path, "items.csv"), index=False)
print("items.csv generated:", df.shape)