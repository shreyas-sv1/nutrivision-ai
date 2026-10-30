import logging
import time
import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms, models
from pathlib import Path

# Full Food-101 class list (alphabetical order — matches torchvision.datasets.Food101)
FOOD101_CLASSES = [
    'apple_pie','baby_back_ribs','baklava','beef_carpaccio','beef_tartare',
    'beet_salad','beignets','bibimbap','bread_pudding','breakfast_burrito',
    'bruschetta','caesar_salad','cannoli','caprese_salad','carrot_cake',
    'ceviche','cheese_plate','cheesecake','chicken_curry','chicken_quesadilla',
    'chicken_wings','chocolate_cake','chocolate_mousse','churros','clam_chowder',
    'club_sandwich','crab_cakes','creme_brulee','croque_madame','cup_cakes',
    'deviled_eggs','donuts','dumplings','edamame','eggs_benedict',
    'escargots','falafel','filet_mignon','fish_and_chips','foie_gras',
    'french_fries','french_onion_soup','french_toast','fried_calamari','fried_rice',
    'frozen_yogurt','garlic_bread','gnocchi','greek_salad','grilled_cheese_sandwich',
    'grilled_salmon','guacamole','gyoza','hamburger','hot_and_sour_soup',
    'hot_dog','huevos_rancheros','hummus','ice_cream','lasagna',
    'lobster_bisque','lobster_roll_sandwich','macaroni_and_cheese','macarons','miso_soup',
    'mussels','nachos','omelette','onion_rings','oysters',
    'pad_thai','paella','pancakes','panna_cotta','peking_duck',
    'pho','pizza','pork_chop','poutine','prime_rib',
    'pulled_pork_sandwich','ramen','ravioli','red_velvet_cake','risotto',
    'samosa','sashimi','scallops','seaweed_salad','shrimp_and_grits',
    'spaghetti_bolognese','spaghetti_carbonara','spring_rolls','steak','strawberry_shortcake',
    'sushi','tacos','takoyaki','tiramisu','tuna_tartare','waffles',
    'aloo_gobi', 'aloo_paratha', 'biryani', 'butter_chicken', 'chai',
    'chaat', 'chole_bhature', 'dal_makhani', 'dal_tadka', 'dhokla',
    'dosa', 'gulab_jamun', 'halwa', 'idli', 'jalebi',
    'kadai_paneer', 'kheer', 'lassi', 'matar_paneer', 'medu_vada',
    'naan', 'palak_paneer', 'paneer_tikka', 'pani_puri', 'paratha',
    'pav_bhaji', 'poha', 'rasgulla', 'rava_dosa', 'rava_idli',
    'rasmalai', 'roti', 'shahi_paneer', 'tandoori_chicken', 'upma',
    'uttapam', 'vada_pav', 'vindaloo', 'malai_kofta', 'korma',
]

# Minimum confidence threshold — predictions below this are flagged as unreliable
LOW_CONFIDENCE_THRESHOLD = 0.40
logger = logging.getLogger("nutrivision.food_api")


class ModelUnavailableError(RuntimeError):
    pass


class FoodClassifier:
    """CNN Food Classifier using an EfficientNet-B0 Food-101 checkpoint."""

    def __init__(self):
        model_load_started = time.perf_counter()
        # Resolve model path dynamically from config or project root
        from ..config import settings
        model_dir = Path(settings.model_dir)
        model_path = model_dir / 'food_classifier/food_classifier.pth'
        if not model_path.exists():
            model_path = model_dir / 'model.pth'
        if not model_path.is_file():
            raise ModelUnavailableError(f"Food model checkpoint not found: {model_path}")
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.class_names = FOOD101_CLASSES[:101] # Ensure only the 101 standard classes
        
        # 1. Initialize EfficientNet-B0
        self.model = models.efficientnet_b0(weights=None)
        num_ftrs = self.model.classifier[1].in_features # 1280
        
        # 2. Load trained weights
        try:
            checkpoint = torch.load(model_path, map_location='cpu', weights_only=True)
            metadata = checkpoint if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint else {}
            state_dict = metadata.get('model_state_dict', checkpoint)
            if not isinstance(state_dict, dict):
                raise ValueError("Checkpoint does not contain a model state dictionary.")
            if metadata.get('trained') is False:
                raise ValueError("Checkpoint is marked as untrained.")
            if metadata.get('architecture') not in (None, 'efficientnet_b0'):
                raise ValueError("Checkpoint architecture does not match EfficientNet-B0.")
            if metadata.get('num_classes') not in (None, len(self.class_names)):
                raise ValueError("Checkpoint class count does not match Food-101.")
            if metadata.get('class_names') is not None and list(metadata['class_names']) != self.class_names:
                raise ValueError("Checkpoint class ordering does not match Food-101.")
            if (
                metadata.get('architecture') == 'efficientnet_b0'
                and metadata.get('val_accuracy') == 0.85
                and 'epoch' not in metadata
                and 'optimizer_state_dict' not in metadata
                and not torch.count_nonzero(state_dict.get('classifier.1.bias', torch.ones(1))).item()
                and state_dict['classifier.1.weight'].abs().max().item() <= 0.07
            ):
                raise ValueError("Checkpoint contains an unverified hardcoded validation score.")

            weight_key = 'classifier.1.weight'
            if weight_key not in state_dict or state_dict[weight_key].shape != (len(self.class_names), num_ftrs):
                raise ValueError("Checkpoint classifier dimensions do not match EfficientNet-B0 Food-101.")
            num_classes = len(self.class_names)

            self.model.classifier = nn.Sequential(
                nn.Dropout(p=0.3, inplace=True),
                nn.Linear(num_ftrs, num_classes)
            )
            self.model.load_state_dict(state_dict, strict=True)
        except Exception as error:
            raise ModelUnavailableError(
                f"Could not load the Food-101 checkpoint: {error}"
            ) from error
        
        self.model.eval()
        self.model.to(self.device)

        # 3. Preprocessing (224x224 for B0)
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        logger.info(
            "[FoodClassifier] Model loaded checkpoint=%s device=%s classes=%d elapsed_ms=%.2f",
            model_path,
            self.device,
            len(self.class_names),
            (time.perf_counter() - model_load_started) * 1000,
        )
        

    def _preprocess(self, image: Image.Image) -> torch.Tensor:
        image = image.convert('RGB')
        return self.transform(image).unsqueeze(0).to(self.device)

    def _format_class_name(self, class_id: str) -> str:
        """Convert snake_case class id to readable Title Case."""
        return ' '.join(w.capitalize() for w in class_id.replace('_', ' ').split())

    def _predict_probabilities(self, image: Image.Image, request_id: str) -> torch.Tensor:
        preprocess_started = time.perf_counter()
        input_tensor = self._preprocess(image)
        logger.info(
            "[FoodAPI] Image preprocessing completed request_id=%s elapsed_ms=%.2f input_size=224",
            request_id,
            (time.perf_counter() - preprocess_started) * 1000,
        )

        inference_started = time.perf_counter()
        logger.info(
            "[FoodAPI] Model inference started request_id=%s device=%s",
            request_id,
            self.device,
        )
        with torch.inference_mode():
            probabilities = torch.softmax(self.model(input_tensor), dim=1)
        logger.info(
            "[FoodAPI] Model inference completed request_id=%s elapsed_ms=%.2f device=%s",
            request_id,
            (time.perf_counter() - inference_started) * 1000,
            self.device,
        )
        return probabilities

    def _format_prediction(self, class_index: int, confidence: float) -> dict:
        class_id = self.class_names[class_index]
        result = {
            "food": self._format_class_name(class_id),
            "class_id": class_id,
            "confidence": confidence,
        }
        if confidence < LOW_CONFIDENCE_THRESHOLD:
            result["warning"] = (
                f"Low confidence ({confidence:.0%}). "
                "Try uploading a clearer, well-lit photo of just the food."
            )
        return result

    def predict(self, image: Image.Image, request_id: str = "unknown") -> dict:
        probabilities = self._predict_probabilities(image, request_id)[0]
        class_index = probabilities.argmax().item()
        return self._format_prediction(class_index, probabilities[class_index].item())

    def predict_top_k(self, image: Image.Image, k: int = 5, request_id: str = "unknown") -> list:
        if not 1 <= k <= len(self.class_names):
            raise ValueError(f"k must be between 1 and {len(self.class_names)}.")

        probabilities = self._predict_probabilities(image, request_id)[0]
        topk_prob, topk_id = torch.topk(probabilities, k)
        return [
            self._format_prediction(topk_id[index].item(), topk_prob[index].item())
            for index in range(k)
        ]