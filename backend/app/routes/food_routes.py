import io
import logging
import threading
import time

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import Image, UnidentifiedImageError
import torch
from pathlib import Path

from ..config import settings
from ..models.food_model import FoodClassifier, ModelUnavailableError
from ..services.nutrition_service import NutritionService

router = APIRouter(prefix="/api", tags=["food"])
logger = logging.getLogger("nutrivision.food_api")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False

MAX_SIZE_BYTES = settings.max_image_size_mb * 1024 * 1024
MAX_IMAGE_PIXELS = settings.max_image_pixels
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
_classifier_lock = threading.Lock()
_food_classifier = None
_model_error = None
nutrition_service = NutritionService()


def model_status() -> dict:
    model_path = Path(settings.model_dir)
    checkpoint_path = model_path / "food_classifier" / "food_classifier.pth"
    if not checkpoint_path.is_file():
        checkpoint_path = model_path / "model.pth"

    return {
        "ready": _food_classifier is not None,
        "checkpoint_present": checkpoint_path.is_file(),
        "device": str(_food_classifier.device) if _food_classifier else "cuda" if torch.cuda.is_available() else "cpu",
        "error": _model_error,
    }


def get_food_classifier() -> FoodClassifier:
    global _food_classifier, _model_error

    if _food_classifier is not None:
        return _food_classifier
    if _model_error is not None:
        raise ModelUnavailableError(_model_error)

    with _classifier_lock:
        if _food_classifier is not None:
            return _food_classifier
        if _model_error is not None:
            raise ModelUnavailableError(_model_error)

        started = time.perf_counter()
        try:
            _food_classifier = FoodClassifier()
        except Exception as error:
            _model_error = str(error)
            logger.exception("[FoodAPI] Model initialization failed")
            raise ModelUnavailableError("Food model is unavailable. Check the checkpoint and backend logs.") from error

        logger.info(
            "[FoodAPI] Model initialization completed elapsed_ms=%.2f device=%s",
            (time.perf_counter() - started) * 1000,
            _food_classifier.device,
        )
        return _food_classifier


async def validate_image(file: UploadFile) -> bytes:
    content_type = (file.content_type or "").lower()
    if content_type and content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type '{content_type}'. Upload a JPEG, PNG, or WebP image.",
        )

    contents = await file.read(MAX_SIZE_BYTES + 1)
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Image exceeds the {settings.max_image_size_mb} MB upload limit.",
        )
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    return contents


def decode_image(contents: bytes) -> Image.Image:
    try:
        with Image.open(io.BytesIO(contents)) as image:
            if image.format not in ALLOWED_FORMATS:
                raise ValueError("Unsupported image format. Upload a JPEG, PNG, or WebP image.")
            if image.width * image.height > MAX_IMAGE_PIXELS:
                raise ValueError(f"Image dimensions exceed the {MAX_IMAGE_PIXELS:,}-pixel limit.")
            image.load()
            return image.convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise ValueError("The uploaded file is not a valid, readable image.") from error

def _predict_top_k(image: Image.Image, k: int, request_id: str) -> list:
    classifier = get_food_classifier()
    return classifier.predict_top_k(image, k=k, request_id=request_id)


def _with_nutrition(prediction: dict) -> dict:
    nutrition = nutrition_service.lookup(prediction["class_id"])
    if not nutrition.get("matched", True):
        raise LookupError(f"Nutrition data is unavailable for {prediction['food']}.")

    return {
        "food": prediction["food"],
        "confidence": prediction["confidence"],
        "calories": nutrition["calories"],
        "protein": nutrition["protein"],
        "carbs": nutrition["carbs"],
        "fat": nutrition["fat"],
        "fiber": nutrition.get("fiber", 0),
        "serving": nutrition.get("serving", "1 serving"),
        **({"warning": prediction["warning"]} if prediction.get("warning") else {}),
        **({"matched_as": nutrition["matched_as"]} if nutrition.get("matched_as") else {}),
    }


async def analyze_image(file: UploadFile, k: int, request_id: str) -> list:
    request_started = time.perf_counter()
    logger.info(
        "[FoodAPI] Request received request_id=%s content_type=%s",
        request_id,
        file.content_type,
    )
    try:
        validation_started = time.perf_counter()
        contents = await validate_image(file)
        logger.info(
            "[FoodAPI] Image validation completed request_id=%s elapsed_ms=%.2f image_bytes=%d",
            request_id,
            (time.perf_counter() - validation_started) * 1000,
            len(contents),
        )

        decode_started = time.perf_counter()
        try:
            image = await run_in_threadpool(decode_image, contents)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        logger.info(
            "[FoodAPI] Image decoding completed request_id=%s elapsed_ms=%.2f width=%d height=%d",
            request_id,
            (time.perf_counter() - decode_started) * 1000,
            image.width,
            image.height,
        )

        inference_started = time.perf_counter()
        try:
            predictions = await run_in_threadpool(_predict_top_k, image, k, request_id)
        except ModelUnavailableError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error
        except Exception as error:
            logger.exception("[FoodAPI] Inference failed request_id=%s", request_id)
            raise HTTPException(
                status_code=500,
                detail=f"Food inference failed. Reference request {request_id} in backend logs.",
            ) from error
        logger.info(
            "[FoodAPI] Model inference completed request_id=%s elapsed_ms=%.2f predictions=%d",
            request_id,
            (time.perf_counter() - inference_started) * 1000,
            len(predictions),
        )

        nutrition_started = time.perf_counter()
        try:
            results = [_with_nutrition(prediction) for prediction in predictions]
        except Exception as error:
            logger.exception("[FoodAPI] Nutrition lookup failed request_id=%s", request_id)
            raise HTTPException(
                status_code=500,
                detail=f"Nutrition data lookup failed. Reference request {request_id} in backend logs.",
            ) from error
        logger.info(
            "[FoodAPI] Nutrition lookup completed request_id=%s elapsed_ms=%.2f",
            request_id,
            (time.perf_counter() - nutrition_started) * 1000,
        )
        return results
    except HTTPException as error:
        logger.warning(
            "[FoodAPI] Request failed request_id=%s status=%d detail=%s",
            request_id,
            error.status_code,
            error.detail,
        )
        raise
    finally:
        logger.info(
            "[FoodAPI] Request completed request_id=%s elapsed_ms=%.2f",
            request_id,
            (time.perf_counter() - request_started) * 1000,
        )


@router.post("/predict-food")
async def predict_food(request: Request, image: UploadFile = File(...)):
    results = await analyze_image(image, 1, request.state.request_id)
    if not results:
        raise HTTPException(status_code=500, detail="The model returned no predictions.")
    return results[0]


@router.post("/predict-food/top-k")
async def predict_food_top_k(
    request: Request,
    image: UploadFile = File(...),
    k: int = 5,
):
    if not 1 <= k <= 101:
        raise HTTPException(status_code=422, detail="k must be between 1 and 101.")
    results = await analyze_image(image, k, request.state.request_id)
    return {"predictions": results}
