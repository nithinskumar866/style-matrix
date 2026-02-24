import torch 
from torch.utils.data import DataLoader
import torch.nn as nn
import torch.optim as optim
from tqdm import tqdm 

from dataset import load_data, DeepFashionDataset
from ai_model import FashionModel
from config import *

def train():
    print("loading data")
    train_df = load_data("train").reset_index(drop=True)
    val_df = load_data("val").reset_index(drop=True)
    
    train_dataset = DeepFashionDataset(train_df, train=True)
    val_dataset = DeepFashionDataset(val_df, train=False)
    
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=NUM_WORKERS)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE)
    
    model = FashionModel().to(DEVICE)
    criteria = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr = LR)
    try:
        for epoch in range(EPOCHS):
            model.train()
            total_loss = 0
            
            for i, (images, labels) in enumerate(tqdm(train_loader)):
                images = images.to(DEVICE)
                labels = labels.to(DEVICE)
                
                outputs, _ = model(images)
                loss = criteria(outputs, labels)
                optimizer.zero_grad()
                loss.backward()
                
                optimizer.step()
                
                total_loss += loss.item()
            checkpoint_path = f"model_epoch_{epoch+1}.pth"
            torch.save(model.state_dict(), checkpoint_path)
            print(f"Saved: {checkpoint_path}")
                
            print(f"Epoch {epoch+1}/{EPOCHS}, Loss: {total_loss/len(train_loader):.4f}")
    except KeyboardInterrupt:
        print("keyboard interrupt")

    torch.save(model.state_dict(), MODEL_SAVE_PATH)
    print("Model saved:", MODEL_SAVE_PATH)


if __name__ == "__main__":
    train()