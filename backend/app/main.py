import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from .config import settings
from .routes import food_routes
from .routes import bodyfat_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        from .database.db import init_db
        init_db()
        print("[OK] Database tables initialized.")
    except Exception as e:
        print(f"[WARN] Database init skipped: {e}")
        print("   App will run without DB persistence.")
    print("[START] NutriVision AI backend ready.")
    yield
    # Shutdown
    print("[STOP] Shutting down NutriVision AI.")


app = FastAPI(
    title="NutriVision AI – Food Calorie API",
    description="Upload food images for calorie and nutrition estimates using EfficientNet-B0.",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes (registered FIRST so /api/* always works)
app.include_router(food_routes.router)
app.include_router(bodyfat_routes.router)


@app.get("/health", tags=["health"])
async def health_check():
    model = food_routes.model_status()
    return {
        "status": "healthy",
        "version": "2.0.0",
        "model_ready": model["ready"],
        "checkpoint_present": model["checkpoint_present"],
        "device": model["device"],
    }


@app.get("/ready", tags=["health"])
async def readiness_check():
    model = food_routes.model_status()
    if not model["ready"]:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "not_ready",
                "model_ready": False,
                "checkpoint_present": model["checkpoint_present"],
                "error": model["error"],
            },
        )
    return {"status": "ready", "model_ready": True, "device": model["device"]}


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = uuid.uuid4().hex
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# Serve React frontend in production — MUST be the very last thing
# html=True makes it serve index.html for all unmatched routes (SPA fallback)
_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.isdir(_dist):
    print(f"[STATIC] Serving frontend from: {_dist}")
    app.mount("/", StaticFiles(directory=_dist, html=True), name="static")
else:
    print(f"[WARN] Frontend dist not found at {_dist} -- API-only mode")

    @app.get("/", tags=["health"])
    async def root():
        return {
            "app": "NutriVision AI",
            "version": "2.0.0",
            "endpoints": {
                "food_prediction": "/api/predict-food",
                "food_prediction_top_k": "/api/predict-food/top-k",
                "docs": "/docs",
            },
        }
