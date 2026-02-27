import torch.nn as nn
import torchvision.models as models
from .config import NUM_CLASSES
import torch
import os

def load_model():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(BASE_DIR, "fashion_resnet50.pth")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = FashionModel()
    state_dict = torch.load(model_path, map_location=device)
    model.load_state_dict(state_dict)
    model.to(device=device)
    model.eval()
    return model    

class FashionModel(nn.Module):
    def __init__(self):
        super().__init__()
        backbone = models.resnet50(weights="IMAGENET1K_V2")
        self.features = nn.Sequential(*list(backbone.children())[:-1])
        self.classifier = nn.Linear(2048, NUM_CLASSES)
    
    def forward(self, x):
        feat = self.features(x)
        feat = feat.view(feat.size(0), - 1)
        out = self.classifier(feat)
        return out, feat