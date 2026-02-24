import torch 
from ai_model import FashioFashionModel
from config import NUM_CLASSES, MODEL_PATH



device = torch.device("cude" if torch.cuda.is_available() else "cpu")

model = FashioFashionModel()
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model.to(device)
model.eval()

print("Model loaded successfully") 