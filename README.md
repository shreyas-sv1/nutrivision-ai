# AI Fitness Analyzer

AI-powered application for food calorie estimation and body fat analysis using deep learning, computer vision, and modern web technologies.

## Features

- **Food Calorie Detection**: Upload a food image to get estimated calories, protein, carbs, and fats using an EfficientNetB0 model trained on Food-101.
- **Body Fat Estimation**: Upload 4 body images (front, back, left, right) to receive body fat percentage and body composition analysis using MediaPipe pose detection.
- **Dashboard**: Track nutrition and body composition over time with interactive Chart.js visualizations.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Chart.js, Axios |
| Backend | Python, FastAPI, Uvicorn |
| ML | PyTorch, EfficientNetB0, MediaPipe, scikit-learn |
| Database | PostgreSQL |
| Deployment | Docker, Vercel (frontend), Render/EC2 (backend) |

## Project Structure

```
fitness-ai-app/
├── frontend/               # React + Vite frontend
│   └── src/
│       ├── components/     # React components
│       ├── api.js          # API client
│       └── App.jsx         # Main app with routing
├── backend/                # FastAPI backend
│   └── app/
│       ├── main.py         # App entry point
│       ├── config.py       # Settings
│       ├── routes/         # API endpoints
│       ├── models/         # ML model wrappers
│       ├── services/       # Business logic
│       ├── database/       # SQLAlchemy models
│       └── data/           # Nutrition database
├── ml_models/              # Trained model weights
├── scripts/                # Training scripts
├── docker/                 # Docker configuration
└── datasets/               # Training datasets
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL (optional, app works without it)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env

# Start the server
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.
The food model is loaded once on the first prediction request. `GET /health` reports
whether the process is running and whether the model has loaded; `GET /ready` returns
503 until the prediction model is ready. `MAX_IMAGE_SIZE_MB` and `MAX_IMAGE_PIXELS`
configure upload limits.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at `http://localhost:5173`.
Keep `VITE_API_URL` empty for local development; Vite proxies `/api` to
`VITE_DEV_API_PROXY_TARGET` (default `http://localhost:8000`). For a separately
hosted production frontend, set `VITE_API_URL` to the backend origin and configure
the backend's `ALLOWED_ORIGINS` to include the frontend origin.

### Train Models (Optional)

Train the food classification model:

```bash
cd scripts
python train_food_model.py --epochs 10 --batch-size 32
```

Train the body fat regression model:

```bash
cd scripts
python train_bodyfat_model.py --n-samples 2000
```

### Docker Deployment

```bash
cd docker
docker-compose up --build
```

## API Reference

### POST /api/predict-food

Upload a food image for calorie estimation.

**Request**: `multipart/form-data` with `image` field

**Response**:
```json
{
  "food": "Chicken Curry",
  "confidence": 0.93,
  "calories": 400,
  "protein": 28,
  "carbs": 18,
  "fat": 25,
  "fiber": 3,
  "serving": "1 bowl (300g)"
}
```

### POST /api/predict-bodyfat

Upload 4 body images for body fat estimation.

**Request**: `multipart/form-data` with `front`, `back`, `left`, `right` image fields and optional `weight_kg` form field

**Response**:
```json
{
  "body_fat": 18.7,
  "category": "Fitness",
  "lean_mass": 57.0,
  "fat_mass": 13.0,
  "weight_kg": 70.0,
  "views_processed": ["front", "back", "left", "right"],
  "measurements": {
    "shoulder_width": 180.5,
    "waist_width": 120.3,
    "hip_width": 140.2,
    "waist_to_shoulder_ratio": 0.6664,
    "hip_to_waist_ratio": 1.1653
  }
}
```

### GET /health

Process health endpoint; includes whether the food model is loaded.

### GET /ready

Prediction readiness endpoint. Returns 503 until the model checkpoint loads.

### POST /api/predict-food/top-k?k=5

Returns up to 101 predictions, each with nutrition data. `k` must be between 1
and 101. Invalid image data, unavailable checkpoints, and inference failures are
returned as explicit HTTP errors rather than placeholder predictions.

## Model Details

### Food Classification
- **Architecture**: EfficientNetB0 with transfer learning
- **Dataset**: Food-101 (101 food categories, 101,000 images)
- **Preprocessing**: Resize to 224x224, normalize with ImageNet stats
- **Output**: Food class + confidence score, mapped to nutrition database
- **Checkpoint**: Must contain compatible trained Food-101 weights. Demo checkpoint
  generators are marked untrained and cannot replace the production checkpoint.

### Body Fat Estimation
- **Pose Detection**: MediaPipe Pose (33 landmarks)
- **Features**: Shoulder width, waist width, hip width, body ratios
- **Regression**: RandomForestRegressor (200 trees)
- **Input**: 4 body images (front, back, left, right views)

## Deployment

### Frontend (Vercel)

```bash
cd frontend
npm run build
# Deploy the dist/ folder to Vercel
```

### Backend (Render)

1. Push the repository to GitHub
2. Create a new Web Service on Render
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Backend (Docker)

```bash
cd docker
docker build -t fitness-ai-backend -f Dockerfile ..
docker run -p 8000:8000 fitness-ai-backend
```

## Security

- CORS protection with configurable origins
- File type validation (JPEG, PNG, WebP only)
- Image size limit (5MB max)
- Input sanitization on all endpoints
