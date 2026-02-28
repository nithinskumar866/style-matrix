import random
import pandas as pd
import os
data_path = os.path.join("..", "..", "..", "data", "polyvore")
df = pd.read_csv(os.path.join(data_path, "items.csv"))

pairs = []

# Positive pairs: same outfit
grouped = df.groupby("outfit_id")
outfit_ids = list(grouped.groups.keys())

for outfit_id in outfit_ids:
    outfit_items = grouped.get_group(outfit_id)
    for i, row1 in outfit_items.iterrows():
        for j, row2 in outfit_items.iterrows():
            if row1["image_path"] != row2["image_path"]:
                pairs.append((row1["image_path"], row2["image_path"], 1))

# Negative pairs: random outfits
for _ in range(len(pairs)):
    out1, out2 = random.sample(outfit_ids, 2)
    item1 = grouped.get_group(out1).sample(1).iloc[0]
    item2 = grouped.get_group(out2).sample(1).iloc[0]
    pairs.append((item1["image_path"], item2["image_path"], 0))

# Save
pairs_df = pd.DataFrame(pairs, columns=["img1", "img2", "label"])
pairs_df.to_csv(os.path.join(data_path, "pairs.csv"), index=False)
print("Pairs generated:", pairs_df.shape)