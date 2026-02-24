import os
import pandas as pd
from PIL import Image
from torch.utils.data import Dataset
from config import DATA_ROOT, CATEGORY_FILE, SPLIT_FILE, MAX_IMAGES_PER_CLASS
from transforms import train_transform, val_transform

def load_data(split_type = "train"):
    cat_df = pd.read_csv(CATEGORY_FILE, sep=r"\s+", skiprows=2, header=None, engine="python")
    cat_df.columns = ["image_path", "category"]
    
    split_df = pd.read_csv(
        SPLIT_FILE,
        sep=r"\s+",
        skiprows=2,
        header=None,
        engine="python"
    )
    split_df.columns = ["image_path", "split"]
    
    df = cat_df.merge(split_df, on="image_path")
    df = df[df["split"] == split_type]
    print(df)
    
    # if MAX_IMAGES_PER_CLASS:
    #     df = pd.concat([
    #         group.sample(n=min(len(group), MAX_IMAGES_PER_CLASS), random_state=42)
    #         for _, group in df.groupby("category")
    #     ]).reset_index(drop=True)
        
    df["category"] -= 1
    
    return df.reset_index(drop=True)

class DeepFashionDataset(Dataset):
    def __init__(self, df, train= True):
        self.df = df.reset_index(drop=True)
        self.transform = train_transform if train else val_transform
        
    def __len__(self):
        return len(self.df)

    def __getitem__(self, index):
        row = self.df.iloc[index]
        img_path = os.path.join(DATA_ROOT, row["image_path"])
        image = Image.open(img_path).convert("RGB")
        image = self.transform(image)
    
        label = int(row.iloc[self.df.columns.get_loc("category")])
        return image, label