# ── Stage 1: Build React frontend ──────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --prefer-offline
COPY frontend/ ./
ENV NODE_OPTIONS="--max_old_space_size=512"
RUN npm run build

# ── Stage 2: Python backend + built frontend ────────────────────────────────
FROM python:3.11-slim AS backend

WORKDIR /app

# System deps for OpenCV / Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 libxext6 libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt .
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# App code
COPY backend/ ./backend/
COPY ml_models/ ./ml_models/

# Copy built frontend into location FastAPI serves
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV PYTHONUNBUFFERED=1
ENV MODEL_DIR=/app/ml_models

WORKDIR /app/backend

EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2
