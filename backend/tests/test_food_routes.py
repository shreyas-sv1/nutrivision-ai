import io
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from PIL import Image

from backend.app.routes import food_routes
from backend.app.models.food_model import ModelUnavailableError


class FakeClassifier:
    device = "cpu"

    def predict_top_k(self, image, k=5, request_id="unknown"):
        return [
            {"food": f"Food {index}", "class_id": "pizza", "confidence": 0.9 - index / 10}
            for index in range(k)
        ]


def image_bytes(image_format="JPEG", size=(32, 24)):
    image = Image.new("RGB", size, color=(200, 80, 20))
    output = io.BytesIO()
    image.save(output, format=image_format)
    return output.getvalue()


def upload(data, content_type="image/jpeg"):
    return UploadFile(
        file=io.BytesIO(data),
        filename="meal",
        headers={"content-type": content_type},
    )


class FoodRouteTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.previous_classifier = food_routes._food_classifier
        self.previous_error = food_routes._model_error
        food_routes._food_classifier = FakeClassifier()
        food_routes._model_error = None
        self.request = SimpleNamespace(state=SimpleNamespace(request_id="test-request"))

    async def asyncTearDown(self):
        food_routes._food_classifier = self.previous_classifier
        food_routes._model_error = self.previous_error

    async def test_valid_jpeg_png_and_webp_return_top_five_with_nutrition(self):
        for image_format, content_type in (
            ("JPEG", "image/jpeg"),
            ("PNG", "image/png"),
            ("WEBP", "image/webp"),
        ):
            with self.subTest(image_format=image_format):
                result = await food_routes.predict_food_top_k(
                    self.request,
                    upload(image_bytes(image_format), content_type),
                    k=5,
                )
                self.assertEqual(len(result["predictions"]), 5)
                self.assertEqual(result["predictions"][0]["food"], "Food 0")
                self.assertEqual(result["predictions"][0]["calories"], 280)
                self.assertIn("serving", result["predictions"][0])

    async def test_invalid_image_contents_return_400(self):
        with self.assertRaises(HTTPException) as raised:
            await food_routes.predict_food_top_k(self.request, upload(b"not an image"))
        self.assertEqual(raised.exception.status_code, 400)

    async def test_unsupported_mime_type_returns_400(self):
        with self.assertRaises(HTTPException) as raised:
            await food_routes.predict_food_top_k(
                self.request,
                upload(image_bytes(), "image/gif"),
            )
        self.assertEqual(raised.exception.status_code, 400)

    async def test_oversized_image_returns_400(self):
        with patch.object(food_routes, "MAX_SIZE_BYTES", 10):
            with self.assertRaises(HTTPException) as raised:
                await food_routes.predict_food_top_k(self.request, upload(image_bytes()))
        self.assertEqual(raised.exception.status_code, 400)

    async def test_invalid_top_k_returns_422(self):
        for k in (0, 102):
            with self.subTest(k=k):
                with self.assertRaises(HTTPException) as raised:
                    await food_routes.predict_food_top_k(self.request, upload(image_bytes()), k=k)
                self.assertEqual(raised.exception.status_code, 422)

    async def test_inference_exception_returns_500(self):
        class FailingClassifier(FakeClassifier):
            def predict_top_k(self, image, k=5, request_id="unknown"):
                raise RuntimeError("model failure")

        food_routes._food_classifier = FailingClassifier()
        with self.assertRaises(HTTPException) as raised:
            await food_routes.predict_food_top_k(self.request, upload(image_bytes()))
        self.assertEqual(raised.exception.status_code, 500)
        self.assertIn("test-request", raised.exception.detail)

    async def test_missing_model_returns_503(self):
        food_routes._food_classifier = None
        with patch.object(food_routes, "FoodClassifier", side_effect=ModelUnavailableError("missing")):
            with self.assertRaises(HTTPException) as raised:
                await food_routes.predict_food_top_k(self.request, upload(image_bytes()))
        self.assertEqual(raised.exception.status_code, 503)

    async def test_single_prediction_response_shape(self):
        result = await food_routes.predict_food(self.request, upload(image_bytes()))
        self.assertEqual(result["food"], "Food 0")
        self.assertEqual(result["calories"], 280)
        self.assertIn("protein", result)


if __name__ == "__main__":
    unittest.main()
