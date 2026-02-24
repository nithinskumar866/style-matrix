import torch.nn as nn
import torchvision.models as models
from config import NUM_CLASSES


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