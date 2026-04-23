import json
import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms, models
from torchvision.models import EfficientNet_B0_Weights
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
]


class FoodClassifier:
    """
    CNN Food Classifier using EfficientNet-B0.

    Modes:
      - Trained mode: loads fine-tuned Food-101 checkpoint (.pth file).
      - Demo mode: uses ImageNet-pretrained weights with a Food-101 class
        mapping. Predictions are rough but the server starts immediately
        without needing to train first.
    """

    def __init__(self):
        model_path = Path(__file__).parent.parent.parent / 'ml_models/food_classifier/food_classifier.pth'
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.demo_mode = False

        # ── TRAINED MODEL ──────────────────────────────────────
        if model_path.exists():
            checkpoint = torch.load(model_path, map_location='cpu')
            self.class_names = checkpoint['class_names']
            num_classes = checkpoint['num_classes']

            self.model = models.efficientnet_b0(weights=None)
            num_ftrs = self.model.classifier[1].in_features
            self.model.classifier = nn.Sequential(
                nn.Dropout(p=0.3, inplace=True),
                nn.Linear(num_ftrs, num_classes)
            )
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.model.eval()
            self.model.to(self.device)

            val_acc = checkpoint.get('val_accuracy', 0) * 100
            print(f"[FoodClassifier] Trained model loaded | EfficientNet-B0 | "
                  f"{num_classes} classes | Val Acc: {val_acc:.2f}%")

        # ── DEMO MODE (no .pth file) ────────────────────────────
        else:
            self.demo_mode = True
            self.class_names = FOOD101_CLASSES
            # Use pretrained ImageNet weights — feature extraction only
            self.model = models.efficientnet_b0(weights=EfficientNet_B0_Weights.IMAGENET1K_V1)
            # Replace classifier with Food-101 head (random weights)
            num_ftrs = self.model.classifier[1].in_features
            self.model.classifier = nn.Sequential(
                nn.Dropout(p=0.3, inplace=True),
                nn.Linear(num_ftrs, len(FOOD101_CLASSES))
            )
            self.model.eval()
            self.model.to(self.device)
            print("[FoodClassifier] WARNING: DEMO MODE - trained .pth not found.")
            print(f"   Model path: {model_path}")
            print("   Run: python train_food_model.py --epochs 10")
            print("   The app will work but predictions are not accurate in demo mode.")

        # ImageNet normalization (same for both modes)
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def _preprocess(self, image: Image.Image) -> torch.Tensor:
        image = image.convert('RGB')
        return self.transform(image).unsqueeze(0).to(self.device)

    def _format_class_name(self, class_id: str) -> str:
        """Convert snake_case class id to readable Title Case."""
        return ' '.join(w.capitalize() for w in class_id.replace('_', ' ').split())

    def predict(self, image: Image.Image) -> dict:
        with torch.no_grad():
            input_tensor = self._preprocess(image)
            outputs = self.model(input_tensor)
            probs = torch.softmax(outputs, dim=1)
            confidence, pred_id = torch.max(probs, 1)
            confidence = confidence.item()
            class_id = self.class_names[pred_id.item()]

        result = {
            "food": self._format_class_name(class_id),
            "class_id": class_id,
            "confidence": confidence,
            "demo_mode": self.demo_mode,
        }

        if confidence < 0.60:
            result["warning"] = "Low confidence prediction. Upload a clearer food image."
        if self.demo_mode:
            result["warning"] = (
                "Demo mode: model not trained yet. "
                "Run 'python train_food_model.py' for accurate results."
            )

        return result

    def predict_top_k(self, image: Image.Image, k: int = 5) -> list:
        with torch.no_grad():
            input_tensor = self._preprocess(image)
            outputs = self.model(input_tensor)
            probs = torch.softmax(outputs, dim=1)
            topk_prob, topk_id = torch.topk(probs, k)

        return [
            {
                "food": self._format_class_name(self.class_names[topk_id[0, i].item()]),
                "class_id": self.class_names[topk_id[0, i].item()],
                "confidence": topk_prob[0, i].item(),
                "demo_mode": self.demo_mode,
            }
            for i in range(k)
        ]
