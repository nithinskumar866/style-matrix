import torch
import torch.nn as nn
import torch.optim as optim
class CompatibilityModel(nn.Module):
    def __init__(self, embedding_dim=512):
        super().__init__()
        self.fc = nn.Sequential(
            nn.Linear(embedding_dim * 2, 512),
            nn.ReLU(),
            nn.Linear(512, 128),
            nn.ReLU(),
            nn.Linear(128, 1),
            nn.Sigmoid()
        )

    def forward(self, emb1, emb2):
        emb1 = emb1.view(-1, 512)
        emb2 = emb2.view(-1, 512)
        x = torch.cat([emb1, emb2], dim=1)
        return self.fc(x)
