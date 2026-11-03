import torch
from transformers import CLIPProcessor, CLIPModel
from app.ai.transforms import val_transform
from .ai.ai_model import load_model
from .ai.config import DEVICE

# Load the models once to keep them in memory
category_model = load_model()

clip_model_id = "patrickjohncyh/fashion-clip"
clip_processor = CLIPProcessor.from_pretrained(clip_model_id)
clip_model = CLIPModel.from_pretrained(clip_model_id).to(DEVICE)
clip_model.eval()

def parse_pgvector(vec):
    if isinstance(vec, str):
        vec = vec.strip("[]")
        return [float(x) for x in vec.split(",")]
    return vec

# Convert list to pgvector array literal
def vector_to_pgvector(vec):
    return "[" + ",".join(map(str, vec)) + "]"

def predict_category(image):
    # Use the evaluation transform, because the training one flips images at random
    image_tensor = val_transform(image).unsqueeze(0).to(DEVICE)

    # Run ResNet Prediction
    with torch.no_grad():
        outputs, _ = category_model(image_tensor)
        _, predicted = torch.max(outputs, 1)
        
    # Return the category index or label
    return predicted.item()

def get_clip_embedding(image):
    
    inputs = clip_processor(images=image, return_tensors="pt")
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

    # Forward pass
    with torch.no_grad():
        outputs = clip_model.get_image_features(**inputs)

    # Hugging Face CLIP returns BaseModelOutputWithPooling or tuple
    # Extract tensor
    if hasattr(outputs, "image_embeds"):      # HF 2.x
        image_tensor = outputs.image_embeds
    elif hasattr(outputs, "pooler_output"):   # older HF
        image_tensor = outputs.pooler_output
    else:
        image_tensor = outputs                 # fallback if raw tensor

    # Normalize, because the compatibility model was trained on unit vectors
    image_tensor = image_tensor / image_tensor.norm(dim=-1, keepdim=True)

    # Convert to list
    return image_tensor.cpu().flatten().tolist()
    # return image_tensor.squeeze().tolist()