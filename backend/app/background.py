from io import BytesIO
from threading import Lock

from PIL import Image

# Small enough to run on a CPU host. Downloaded the first time it is used.
BACKGROUND_MODEL = "silueta"

session = None
session_lock = Lock()


def get_session():
    # Loaded on first use, because most requests never need it
    global session
    with session_lock:
        if session is None:
            from rembg import new_session
            session = new_session(BACKGROUND_MODEL)
    return session


def remove_background(image_bytes: bytes) -> bytes:
    # Checked before loading the model, so a bad file fails quickly
    image = Image.open(BytesIO(image_bytes)).convert("RGB")

    from rembg import remove
    result = remove(image, session=get_session())
    buffer = BytesIO()
    result.save(buffer, format="PNG")
    return buffer.getvalue()
