import torch 
DATA_ROOT = "../../data"
CATEGORY_FILE = "../../data/list_category_img.txt"
SPLIT_FILE = "../../data/list_eval_partition.txt"

BATCH_SIZE = 32
EPOCHS = 5
LR = 1e-4
NUM_WORKERS = 4

NUM_CLASSES = 50
IMAGE_SIZE = 224
MAX_IMAGES_PER_CLASS = 5000

MODEL_SAVE_PATH = "fashion_resnet50.pth"
MODEL_PATH = "model_epoch_3.pth"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")