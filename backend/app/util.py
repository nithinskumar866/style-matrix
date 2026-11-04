import torch
from transformers import CLIPProcessor, CLIPModel
from app.ai.transforms import val_transform
from .ai.ai_model import load_model
from .ai.config import DEVICE
from .outfit_rules import ACCESSORY_CATEGORY, SHOES_CATEGORY

# Load the models once to keep them in memory
category_model = load_model()

clip_model_id = "patrickjohncyh/fashion-clip"
clip_processor = CLIPProcessor.from_pretrained(clip_model_id)
clip_model = CLIPModel.from_pretrained(clip_model_id).to(DEVICE)
clip_model.eval()

# The classifier only knows clothing, so FashionCLIP catches what it would mislabel
GARMENT_TYPE_LABELS = {
    SHOES_CATEGORY: "a photo of a pair of shoes",
    ACCESSORY_CATEGORY: "a photo of a fashion accessory such as a bag, hat, belt, watch or jewelry",
    None: "a photo of a piece of clothing such as a shirt, trousers, dress or jacket",
}

def detect_non_clothing(image):
    """Returns the shoes or accessory category, or None for ordinary clothing."""
    inputs = clip_processor(
        text=list(GARMENT_TYPE_LABELS.values()), images=image, return_tensors="pt", padding=True
    )
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
    with torch.no_grad():
        logits = clip_model(**inputs).logits_per_image
    return list(GARMENT_TYPE_LABELS)[logits.argmax(dim=-1).item()]

def parse_pgvector(vec):
    if isinstance(vec, str):
        vec = vec.strip("[]")
        return [float(x) for x in vec.split(",")]
    return vec

# Convert list to pgvector array literal
def vector_to_pgvector(vec):
    return "[" + ",".join(map(str, vec)) + "]"

def predict_category(image):
    non_clothing = detect_non_clothing(image)
    if non_clothing is not None:
        return non_clothing

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