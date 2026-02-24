import torch
from torch.utils.data import DataLoader
from torchvision import transforms

from dataset import DeepFashionDataset
from ai_model import FashionModel
from train import load_data

from config import NUM_CLASSES, BATCH_SIZE, DEVICE, MODEL_PATH, IMAGE_SIZE, MODEL_SAVE_PATH

print("loading validation data")
val_df = load_data("val").reset_index(drop = True)

transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor()
])

val_dataset = DeepFashionDataset(val_df, train=False)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

print("loading model")
model = FashionModel()
model.load_state_dict(torch.load(MODEL_SAVE_PATH, map_location=DEVICE))
model.to(DEVICE)
model.eval()

print("evaluating")
correct = 0
total = 0
try: 
    with torch.no_grad():
        for i, (images, labels) in enumerate(val_loader):
            if i % 50 == 0 or i % len(val_loader) == 0:
                print(f"{i + 1} / {len(val_loader)}")
            images = images.to(DEVICE)
            labels = labels.to(DEVICE)
            
            outputs, _ = model(images)
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)
except KeyboardInterrupt as e: 
    print("interrupted")
        
    
accuracy = correct / total
print(f"model accuracy:  {accuracy:.4f}")