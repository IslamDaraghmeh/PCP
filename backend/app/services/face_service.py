import os
import uuid
import numpy as np
from typing import List, Tuple, Optional
from PIL import Image as PILImage
from deepface import DeepFace
import pickle

from app.core.config import settings


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
        """
        try:
            # align=True is DeepFace's default but we set it explicitly: alignment
            # rotates the crop so eyes are horizontal, which materially improves
            # Facenet512 embedding quality (≈3-5pp on LFW in practice).
            face_objs = DeepFace.represent(
                img_path=image_path,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                align=True,
            )

            faces = []
            for i, face_obj in enumerate(face_objs):
                facial_area = face_obj.get("facial_area", {})
                embedding = face_obj.get("embedding", [])
                confidence = float(face_obj.get("face_confidence", 0.0))
                w = facial_area.get("w", 0)
                h = facial_area.get("h", 0)

                if not embedding:
                    continue

                # Drop low-quality detections — these otherwise become noise in
                # the FAISS index and degrade every future search.
                if w < self.MIN_FACE_SIZE_PX or h < self.MIN_FACE_SIZE_PX:
                    continue
                if confidence and confidence < self.MIN_FACE_CONFIDENCE:
                    continue

                # Save cropped face image
                face_image_path = self._save_face_crop(
                    image_path, facial_area, i
                )

                faces.append({
                    "bbox_x": facial_area.get("x", 0),
                    "bbox_y": facial_area.get("y", 0),
                    "bbox_width": w,
                    "bbox_height": h,
                    "embedding": np.array(embedding, dtype=np.float32),
                    "confidence": confidence,
                    "face_image_path": face_image_path
                })

            return faces
        except Exception as e:
            print(f"Error detecting faces: {e}")
            return []

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
        to emit. The "first face" heuristic was wrong whenever the subject
        wasn't the leftmost person in the frame.
        """
        # Try with enforce_detection=True first. If retinaface finds nothing,
        # fall back to enforce_detection=False so DeepFace can still try; we
        # then validate with a confidence check and reject obvious non-faces.
        try:
            face_objs = DeepFace.represent(
                img_path=image_path,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=True,
                align=True,
            )
        except Exception:
            try:
                face_objs = DeepFace.represent(
                    img_path=image_path,
                    model_name=self.model_name,
                    detector_backend=self.detector_backend,
                    enforce_detection=False,
                    align=True,
                )
            except Exception as e:
                print(f"Error getting embedding: {e}")
                return None

        if not face_objs:
            return None

        candidates = []
        for face_obj in face_objs:
            embedding = face_obj.get("embedding")
            if not embedding:
                continue
            area = face_obj.get("facial_area", {})
            w = area.get("w", 0)
            h = area.get("h", 0)
            confidence = float(face_obj.get("face_confidence", 0.0))

            # Reject crops that are too small or clearly not a face — protects
            # the enforce_detection=False fallback from returning the whole
            # image as a phantom "face".
            if w < self.MIN_FACE_SIZE_PX or h < self.MIN_FACE_SIZE_PX:
                continue
            if confidence and confidence < self.MIN_FACE_CONFIDENCE:
                continue

            score = (w * h) * max(confidence, 0.01)
            candidates.append({
                "embedding": np.array(embedding, dtype=np.float32),
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
