import os
import joblib
import numpy as np
from PIL import Image
from pathlib import Path
import math

class BodyFatService:
    def __init__(self):
        from ..config import settings
        model_dir = Path(settings.model_dir)
        self.model_path = model_dir / 'bodyfat_regression/bodyfat_model.pkl'
        self.model = None
        self.feature_names = None
        
        if self.model_path.exists():
            try:
                artifact = joblib.load(self.model_path)
                self.model = artifact['model']
                self.feature_names = artifact['feature_names']
                print(f"[BodyFatService] Loaded model from {self.model_path} successfully.")
            except Exception as e:
                print(f"[BodyFatService] Error loading RandomForest model: {e}")
        else:
            print(f"[BodyFatService] RandomForest model not found at {self.model_path}.")

    def _detect_landmarks_tasks(self, image: Image.Image):
        try:
            import mediapipe as mp
            from mediapipe.tasks import python
            from mediapipe.tasks.python import vision
            from ..config import settings
            
            task_path = os.path.join(settings.model_dir, "pose_landmarker_heavy.task")
            if not os.path.exists(task_path):
                return None
                
            options = vision.PoseLandmarkerOptions(
                base_options=python.BaseOptions(model_asset_path=task_path),
                running_mode=vision.RunningMode.IMAGE
            )
            
            img_rgb = np.array(image.convert("RGB"))
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
            
            with vision.PoseLandmarker.create_from_options(options) as landmarker:
                result = landmarker.detect(mp_image)
                if result.pose_landmarks:
                    return result.pose_landmarks[0]
        except Exception as e:
            print(f"[BodyFatService] MediaPipe Tasks error: {e}")
        return None

    def _detect_landmarks_solutions(self, image: Image.Image):
        try:
            import mediapipe as mp
            mp_pose = mp.solutions.pose
            
            img_rgb = np.array(image.convert("RGB"))
            
            with mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5) as pose:
                results = pose.process(img_rgb)
                if results.pose_landmarks:
                    return results.pose_landmarks.landmark
        except Exception as e:
            print(f"[BodyFatService] MediaPipe Solutions error: {e}")
        return None

    def detect_landmarks(self, image: Image.Image):
        # Try Tasks API first, then Solutions API
        landmarks = self._detect_landmarks_tasks(image)
        if landmarks is not None:
            return landmarks
        return self._detect_landmarks_solutions(image)

    def calculate_features_from_landmarks(self, landmarks, image_size, height_m: float):
        w_px, h_px = image_size
        
        def get_pt(lm):
            return lm.x * w_px, lm.y * h_px
            
        try:
            nose = get_pt(landmarks[0])
            l_shoulder = get_pt(landmarks[11])
            r_shoulder = get_pt(landmarks[12])
            l_elbow = get_pt(landmarks[13])
            r_elbow = get_pt(landmarks[14])
            l_hip = get_pt(landmarks[23])
            r_hip = get_pt(landmarks[24])
            l_knee = get_pt(landmarks[25])
            r_knee = get_pt(landmarks[26])
            l_ankle = get_pt(landmarks[27])
            r_ankle = get_pt(landmarks[28])
            
            y_ankle_mid = (l_ankle[1] + r_ankle[1]) / 2.0
            y_nose = nose[1]
            pixel_height = y_ankle_mid - y_nose
            
            if pixel_height < 50:
                return None
                
            scale = height_m / pixel_height
            
            def dist(p1, p2):
                return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)
                
            shoulder_width = dist(l_shoulder, r_shoulder) * scale
            hip_width = dist(l_hip, r_hip) * scale
            
            sh_mid = ((l_shoulder[0] + r_shoulder[0])/2.0, (l_shoulder[1] + r_shoulder[1])/2.0)
            hip_mid = ((l_hip[0] + r_hip[0])/2.0, (l_hip[1] + r_hip[1])/2.0)
            torso_length = dist(sh_mid, hip_mid) * scale
            
            thigh_l = dist(l_hip, l_knee)
            thigh_r = dist(r_hip, r_knee)
            thigh_length = ((thigh_l + thigh_r) / 2.0) * scale
            
            arm_l = dist(l_shoulder, l_elbow)
            arm_r = dist(r_shoulder, r_elbow)
            upper_arm_length = ((arm_l + arm_r) / 2.0) * scale
            
            # Clip bounds to keep values physically sound in case of posture outliers
            shoulder_width = max(0.2 * height_m, min(0.35 * height_m, shoulder_width))
            hip_width = max(0.15 * height_m, min(0.35 * height_m, hip_width))
            torso_length = max(0.2 * height_m, min(0.4 * height_m, torso_length))
            thigh_length = max(0.15 * height_m, min(0.35 * height_m, thigh_length))
            upper_arm_length = max(0.1 * height_m, min(0.25 * height_m, upper_arm_length))
            
            return {
                "shoulder_width": shoulder_width,
                "hip_width": hip_width,
                "torso_length": torso_length,
                "thigh_length": thigh_length,
                "upper_arm_length": upper_arm_length,
                "body_height": height_m
            }
        except Exception as e:
            print(f"[BodyFatService] Feature extraction error: {e}")
            return None

    def estimate_features_demographic(self, height_m: float, weight_kg: float, gender_val: int, age: float) -> dict:
        bmi = weight_kg / (height_m ** 2)
        
        if gender_val == 0:  # Male
            shoulder_base = 0.25 * height_m
            hip_base = 0.18 * height_m
        else:  # Female
            shoulder_base = 0.23 * height_m
            hip_base = 0.22 * height_m
            
        fat_factor = max(0.0, min(1.0, (bmi - 15) / 25.0))
        
        shoulder_width = shoulder_base + (fat_factor * 0.05)
        hip_width = hip_base + (fat_factor * 0.15)
        
        torso_length = height_m * 0.50
        thigh_length = height_m * 0.26
        upper_arm_length = height_m * 0.185
        
        return {
            "shoulder_width": shoulder_width,
            "hip_width": hip_width,
            "torso_length": torso_length,
            "thigh_length": thigh_length,
            "upper_arm_length": upper_arm_length,
            "body_height": height_m
        }

    def predict_bodyfat(self, images: dict, weight_kg: float, height_cm: float, gender: str, age: int) -> dict:
        height_m = height_cm / 100.0
        bmi = weight_kg / (height_m ** 2)
        gender_val = 0 if gender.lower() == 'male' else 1
        
        # 1. Base demographic frame
        features = self.estimate_features_demographic(height_m, weight_kg, gender_val, age)
        
        # 2. Extract visual measurements if images are provided and pose is detected
        views_processed = []
        visual_measurements = []
        
        for view_name, img in images.items():
            if img is not None:
                landmarks = self.detect_landmarks(img)
                if landmarks is not None:
                    meas = self.calculate_features_from_landmarks(landmarks, img.size, height_m)
                    if meas is not None:
                        views_processed.append(view_name)
                        visual_measurements.append(meas)
        
        # Blend visual measurements if any views processed successfully
        if len(visual_measurements) > 0:
            avg_vis = {}
            keys = ["shoulder_width", "hip_width", "torso_length", "thigh_length", "upper_arm_length"]
            for key in keys:
                avg_vis[key] = sum(m[key] for m in visual_measurements) / len(visual_measurements)
            
            # Blend 70% visual / 30% demographic to filter noise and preserve stability
            for key in keys:
                features[key] = 0.7 * avg_vis[key] + 0.3 * features[key]
                
        # 3. Derive remaining features needed for RandomForest
        shoulder_width = features["shoulder_width"]
        hip_width = features["hip_width"]
        torso_length = features["torso_length"]
        thigh_length = features["thigh_length"]
        upper_arm_length = features["upper_arm_length"]
        
        # Chest expansion with BMI/fat
        fat_factor = max(0.0, min(1.0, (bmi - 15) / 25.0))
        chest_width = (shoulder_width * 0.85) + (fat_factor * 0.05)
        
        # Waist expansion highly correlated with fat
        waist_width = (shoulder_width + hip_width) / 2.0 * (0.8 + 0.01 * (bmi - 20.0))
        
        # Ratios
        waist_to_shoulder_ratio = waist_width / shoulder_width
        hip_to_waist_ratio = hip_width / waist_width
        hip_to_shoulder_ratio = hip_width / shoulder_width
        torso_to_height_ratio = torso_length / height_m
        
        # Compile full feature array matching FEATURE_NAMES in train_bodyfat_model.py
        feature_dict = {
            "shoulder_width": shoulder_width,
            "waist_width": waist_width,
            "hip_width": hip_width,
            "chest_width": chest_width,
            "torso_length": torso_length,
            "thigh_length": thigh_length,
            "upper_arm_length": upper_arm_length,
            "body_height": height_m,
            "waist_to_shoulder_ratio": waist_to_shoulder_ratio,
            "hip_to_waist_ratio": hip_to_waist_ratio,
            "hip_to_shoulder_ratio": hip_to_shoulder_ratio,
            "torso_to_height_ratio": torso_to_height_ratio,
            "gender": gender_val,
            "age": age,
            "bmi": bmi
        }
        
        FEATURE_NAMES = [
            "shoulder_width", "waist_width", "hip_width", "chest_width", "torso_length",
            "thigh_length", "upper_arm_length", "body_height", "waist_to_shoulder_ratio",
            "hip_to_waist_ratio", "hip_to_shoulder_ratio", "torso_to_height_ratio",
            "gender", "age", "bmi"
        ]
        
        X = np.array([feature_dict[name] for name in FEATURE_NAMES]).reshape(1, -1)
        
        # 4. Regressor Prediction with fallback formula
        if self.model is not None:
            try:
                body_fat_pred = float(self.model.predict(X)[0])
            except Exception as e:
                print(f"[BodyFatService] Regressor predict error, falling back to formula: {e}")
                body_fat_pred = self._predict_fallback(bmi, gender_val, age)
        else:
            body_fat_pred = self._predict_fallback(bmi, gender_val, age)
            
        # 5. Body composition categorization
        category = self.categorize_bodyfat(body_fat_pred, gender)
        fat_mass = (body_fat_pred / 100.0) * weight_kg
        lean_mass = weight_kg - fat_mass
        
        return {
            "body_fat": round(body_fat_pred, 1),
            "category": category,
            "lean_mass": round(lean_mass, 1),
            "fat_mass": round(fat_mass, 1),
            "weight_kg": weight_kg,
            "views_processed": views_processed if len(views_processed) > 0 else ["demographic_estimation"],
            "measurements": {
                "shoulder_width": round(shoulder_width * 100, 1),  # cm for readable response
                "waist_width": round(waist_width * 100, 1),
                "hip_width": round(hip_width * 100, 1),
                "waist_to_shoulder_ratio": round(waist_to_shoulder_ratio, 4),
                "hip_to_waist_ratio": round(hip_to_waist_ratio, 4)
            }
        }

    def _predict_fallback(self, bmi: float, gender_val: int, age: float) -> float:
        # Base fat: Male 5%, Female 13%
        base_fat = 5.0 if gender_val == 0 else 13.0
        added_fat = max(0.0, min(1.0, (bmi - 15) / 25.0)) * 35.0
        age_contrib = (age - 20) * 0.1
        body_fat = base_fat + added_fat + age_contrib
        return max(4.0, min(55.0, body_fat))

    def categorize_bodyfat(self, bf: float, gender: str) -> str:
        # Essential fat, Athletes, Fitness, Average, Obese
        is_male = gender.lower() == 'male'
        if is_male:
            if bf < 6: return "Essential Fat"
            elif bf < 14: return "Athletes"
            elif bf < 18: return "Fitness"
            elif bf < 25: return "Average"
            else: return "Obese"
        else:
            if bf < 14: return "Essential Fat"
            elif bf < 21: return "Athletes"
            elif bf < 25: return "Fitness"
            elif bf < 32: return "Average"
            else: return "Obese"
