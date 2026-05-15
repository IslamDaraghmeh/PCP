import os
import uuid
import numpy as np
from typing import List, Tuple, Optional
from PIL import Image as PILImage
import pickle

from app.core.config import settings
from app.services.embedding_pipeline import embedding_pipeline


class FaceService:
    def __init__(self):
        self.model_name = settings.FACE_MODEL
        self.detector_backend = settings.DETECTOR_BACKEND
        self.faces_dir = os.path.join(settings.UPLOAD_DIR, "faces")
        os.makedirs(self.faces_dir, exist_ok=True)

    # Faces smaller than this in either dimension produce noisy embeddings — skip
    # them at indexing time so they can't pollute search results.
    MIN_FACE_SIZE_PX = 32
    MIN_FACE_CONFIDENCE = 0.85

    def detect_faces(self, image_path: str) -> List[dict]:
        """
        Detect all faces in an image and return their bounding boxes and embeddings.
        Delegates the actual model work to the configured EmbeddingPipeline so
        ensemble / TTA changes are pure config flips.
        """
        detected = embedding_pipeline.detect_and_embed(image_path)

        faces: List[dict] = []
        for i, det in enumerate(detected):
            facial_area = det.get("facial_area") or {}
            embedding = det.get("embedding")
            confidence = float(det.get("confidence", 0.0))
            w = facial_area.get("w", 0)
            h = facial_area.get("h", 0)

            if embedding is None:
                continue

            # Drop low-quality detections — these otherwise become noise in
            # the FAISS index and degrade every future search.
            if w < self.MIN_FACE_SIZE_PX or h < self.MIN_FACE_SIZE_PX:
                continue
            if confidence and confidence < self.MIN_FACE_CONFIDENCE:
                continue

            face_image_path = self._save_face_crop(image_path, facial_area, i)

            faces.append({
                "bbox_x": facial_area.get("x", 0),
                "bbox_y": facial_area.get("y", 0),
                "bbox_width": w,
                "bbox_height": h,
                "embedding": embedding,
                "confidence": confidence,
                "face_image_path": face_image_path,
            })

        return faces

    def _save_face_crop(self, image_path: str, facial_area: dict, index: int) -> str:
        """Save cropped face from the image."""
        try:
            img = PILImage.open(image_path)
            x = facial_area.get("x", 0)
            y = facial_area.get("y", 0)
            w = facial_area.get("w", 0)
            h = facial_area.get("h", 0)

            # Add padding
            padding = int(max(w, h) * 0.2)
            x1 = max(0, x - padding)
            y1 = max(0, y - padding)
            x2 = min(img.width, x + w + padding)
            y2 = min(img.height, y + h + padding)

            face_crop = img.crop((x1, y1, x2, y2))

            # PNGs (and similar) need RGB conversion before JPEG save — otherwise
            # alpha/palette modes raise and the face record ends up with no thumbnail.
            if face_crop.mode not in ("RGB", "L"):
                face_crop = face_crop.convert("RGB")

            # Generate unique filename
            face_filename = f"{uuid.uuid4().hex}.jpg"
            face_path = os.path.join(self.faces_dir, face_filename)
            face_crop.save(face_path, "JPEG", quality=95)

            return face_path
        except Exception as e:
            print(f"Error saving face crop: {e}")
            return ""

    def get_embedding_from_image(self, image_path: str) -> Optional[np.ndarray]:
        """Get face embedding from a single-face image (for search).

        Uses enforce_detection=True with a fallback so we never embed the whole
        frame as a "face" — that was the root cause of garbage matches when the
        query image had no detectable face.
        """
        best = self.get_best_query_face(image_path)
        if best is None:
            return None
        return best["embedding"]

    def get_best_query_face(self, image_path: str) -> Optional[dict]:
        """Pick the most reliable face in a query image.

        Returns the face with the highest score = area * confidence — the
        largest, sharpest face — instead of just the first one DeepFace happens
        to emit.
        """
        detected = embedding_pipeline.detect_and_embed(image_path)
        if not detected:
            return None

        candidates = []
        for det in detected:
            area = det.get("facial_area") or {}
            embedding = det.get("embedding")
            if embedding is None:
                continue
            w = area.get("w", 0)
            h = area.get("h", 0)
            confidence = float(det.get("confidence", 0.0))

            # Reject crops too small or clearly not a face.
            if w < self.MIN_FACE_SIZE_PX or h < self.MIN_FACE_SIZE_PX:
                continue
            if confidence and confidence < self.MIN_FACE_CONFIDENCE:
                continue

            score = (w * h) * max(confidence, 0.01)
            candidates.append({
                "embedding": embedding,
                "confidence": confidence,
                "area": area,
                "score": score,
            })

        if not candidates:
            return None
        candidates.sort(key=lambda c: c["score"], reverse=True)
        return candidates[0]

    def serialize_embedding(self, embedding: np.ndarray) -> bytes:
        """Convert embedding to bytes for database storage."""
        return pickle.dumps(embedding)

    def deserialize_embedding(self, data: bytes) -> np.ndarray:
        """Convert bytes back to embedding array."""
        return pickle.loads(data)

    def calculate_similarity(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """Calculate cosine similarity between two embeddings."""
        dot_product = np.dot(emb1, emb2)
        norm1 = np.linalg.norm(emb1)
        norm2 = np.linalg.norm(emb2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(dot_product / (norm1 * norm2))


face_service = FaceService()
