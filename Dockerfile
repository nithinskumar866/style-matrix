FROM python:3.11-slim

# Switch to root to install system-level packages
USER root
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Now switch to the HF user
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Copy requirements from the backend folder
COPY --chown=user backend/requirements.txt .

# Install dependencies (CPU versions to avoid the error you had)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend folder
COPY --chown=user backend/ .

# Ensure the port matches the one in your README.md (7860)
# Make sure your FastAPI entry point is indeed in 'main.py'
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]