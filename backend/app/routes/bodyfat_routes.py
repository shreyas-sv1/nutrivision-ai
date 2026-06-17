from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from PIL import Image
import io
from sqlalchemy.orm import Session
from ..services.bodyfat_service import BodyFatService
from ..database.db import get_db, BodyFatPrediction

router = APIRouter(prefix="/api", tags=["bodyfat"])

# Initialize bodyfat service at module level
bodyfat_service = BodyFatService()

@router.post("/predict-bodyfat")
async def predict_bodyfat(
    front: UploadFile = File(None),
    back: UploadFile = File(None),
    left: UploadFile = File(None),
    right: UploadFile = File(None),
    weight_kg: float = Form(...),
    height_cm: float = Form(...),
    gender: str = Form(...),
    age: int = Form(...),
    db: Session = Depends(get_db)
):
    """
    Upload body views (front, back, left, right) and demographics to get body fat estimation.
    Uses MediaPipe for pose detection and RandomForestRegressor for regression.
    """
    images = {}
    
    # Parse and open uploaded files as PIL Images
    for name, file in [("front", front), ("back", back), ("left", left), ("right", right)]:
        if file is not None and file.filename != "":
            try:
                contents = await file.read()
                if len(contents) > 0:
                    images[name] = Image.open(io.BytesIO(contents))
            except Exception:
                raise HTTPException(status_code=400, detail=f"Could not parse the {name} image.")

    try:
        # Get predictions
        result = bodyfat_service.predict_bodyfat(
            images=images,
            weight_kg=weight_kg,
            height_cm=height_cm,
            gender=gender,
            age=age
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Body fat analysis failed: {str(e)}")

    # Persist to database if possible
    try:
        db_prediction = BodyFatPrediction(
            body_fat_percentage=result["body_fat"],
            category=result["category"],
            lean_mass=result["lean_mass"],
            fat_mass=result["fat_mass"],
            shoulder_width=result["measurements"]["shoulder_width"],
            waist_width=result["measurements"]["waist_width"],
            hip_width=result["measurements"]["hip_width"],
            waist_to_shoulder_ratio=result["measurements"]["waist_to_shoulder_ratio"],
            hip_to_waist_ratio=result["measurements"]["hip_to_waist_ratio"],
            image_urls=",".join(result["views_processed"])
        )
        db.add(db_prediction)
        db.commit()
        db.refresh(db_prediction)
    except Exception as e:
        # Fallback for environments without database running
        print(f"[WARN] Database save skipped: {e}")

    return result
