import torch
import torch.nn as nn
import torch.optim as optim
import pandas as pd
import os
from torch.utils.data import Dataset, DataLoader
from compatibility_model import CompatibilityModel

device = "cuda" if torch.cuda.is_available() else "cpu"
data_path = os.path.join("..", "..", "..", "data", "polyvore")

# Load embeddings
embeddings = torch.load(f"{data_path}/fashion_clip_embeddings.pt")


# Dataset
class PairDataset(Dataset):
    def __init__(self, pairs_csv):
        self.df = pd.read_csv(pairs_csv)
        self.embeddings = embeddings

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        
        # Convert NumPy array to PyTorch Tensor first, then call .float()
        emb1 = torch.from_numpy(self.embeddings[row["img1"]]).float()
        emb2 = torch.from_numpy(self.embeddings[row["img2"]]).float()
        
        label = torch.tensor(row["label"], dtype=torch.float32)
        return emb1, emb2, label

# Training
dataset = PairDataset(f"{data_path}/pairs.csv")
loader = DataLoader(dataset, batch_size=64, shuffle=True)

model = CompatibilityModel().to(device)
criterion = nn.BCELoss()
optimizer = optim.Adam(model.parameters(), lr=1e-4)

for epoch in range(10):
    total_loss = 0
    for emb1, emb2, label in loader:
        emb1, emb2, label = emb1.to(device), emb2.to(device), label.to(device)
        optimizer.zero_grad()
        out = model(emb1, emb2).squeeze()
        loss = criterion(out, label)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
    print(f"Epoch {epoch+1}, Loss: {total_loss/len(loader)}")

save_path = os.path.join(data_path, "compatibility_model.pth")
torch.save(model.state_dict(), save_path)
print("Model saved at:", save_path)