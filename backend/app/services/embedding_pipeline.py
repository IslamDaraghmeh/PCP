"""
Pluggable embedding pipeline.

A single image goes in. For each configured embedding model the pipeline
computes a 1xD vector; optionally averages it with the horizontal-flip
embedding (test-time augmentation); concatenates across models; and L2-
normalizes the whole vector before returning.

Behavior with the default config (`EMBEDDING_MODELS=["Facenet512"]`,
`USE_TTA=False`) is byte-for-byte identical to the previous single-model
`face_service.detect_faces` flow — Phase B is a refactor, not a feature flip.
Switching to an ensemble (Phase C) or a new model (Phase D) is a config edit
+ one-shot re-embed migration; no code change in callers.
"""
from typing import List, Optional, Sequence

import numpy as np
from deepface import DeepFace

from app.core.config import settings


# Embedding dimensions per DeepFace model. Used to size the FAISS index up
# front, before we have any embeddings to inspect.
_MODEL_DIMENSIONS = {
    "VGG-Face": 4096,
    "Facenet": 128,
    "Facenet512": 512,
    "OpenFace": 128,
    "DeepFace": 4096,
    "DeepID": 160,
    "ArcFace": 512,
    "Dlib": 128,
    "SFace": 128,
    "GhostFaceNet": 512,
}


def _embed_with_model(image, model_name: str, align: bool) -> Optional[List[float]]:
    """Run DeepFace.represent on an image (path or numpy array) with one model.

    `align=True` only matters when DeepFace does its own detection; when we
    pass an already-cropped face we set align=False because alignment already
    happened during the initial detection pass.
    """
    detector = "skip" if isinstance(image, np.ndarray) else settings.DETECTOR_BACKEND
    try:
        objs = DeepFace.represent(
            img_path=image,
            model_name=model_name,
            detector_backend=detector,
            enforce_detection=False,
            align=align,
        )
    except Exception as e:
        print(f"[embedding_pipeline] {model_name} failed: {e}")
        return None
    if not objs:
        return None
    emb = objs[0].get("embedding")
    return emb if emb else None


class EmbeddingPipeline:
    def __init__(
        self,
        models: Sequence[str],
        use_tta: bool,
        detector_backend: str,
    ):
        if not models:
            raise ValueError("EmbeddingPipeline needs at least one model")
        for m in models:
            if m not in _MODEL_DIMENSIONS:
                raise ValueError(
                    f"Unknown embedding model '{m}'. Known: {sorted(_MODEL_DIMENSIONS)}"
                )
        self.models = list(models)
        self.use_tta = use_tta
        self.detector_backend = detector_backend
        self.dimension = sum(_MODEL_DIMENSIONS[m] for m in self.models)

    # --- Detection + multi-model embedding for a full image -------------------

    def detect_and_embed(self, image_path: str) -> List[dict]:
        """
        Detect every face in `image_path` and return a list of dicts:
          { "facial_area": {x,y,w,h}, "embedding": np.ndarray, "confidence": float }
        Embeddings are concatenated across the configured models, optionally
        averaged with the horizontal-flip embedding per model, then L2-
        normalized.
        """
        primary = self.models[0]
        try:
            face_objs = DeepFace.represent(
                img_path=image_path,
                model_name=primary,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                align=True,
            )
        except Exception as e:
            print(f"[embedding_pipeline] detection failed: {e}")
            return []

        if not face_objs:
            return []

        # If we need additional models or TTA, we'll re-embed cropped regions.
        # Skip the image load when neither is needed (the common Phase-B path).
        need_image = self.use_tta or len(self.models) > 1
        original = self._load_rgb(image_path) if need_image else None

        results: List[dict] = []
        for face_obj in face_objs:
            area = face_obj.get("facial_area") or {}
            primary_emb = face_obj.get("embedding")
            if not primary_emb:
                continue
            confidence = float(face_obj.get("face_confidence", 0.0))

            per_model_vectors: List[np.ndarray] = []

            # Primary model: we already have the embedding for the original
            # crop. If TTA, average it with the flipped crop's embedding.
            primary_vec = np.array(primary_emb, dtype=np.float32)
            if self.use_tta and original is not None:
                flipped = self._flip_crop(original, area)
                if flipped is not None:
                    tta_emb = _embed_with_model(flipped, primary, align=False)
                    if tta_emb is not None:
                        primary_vec = (primary_vec + np.array(tta_emb, dtype=np.float32)) / 2.0
            per_model_vectors.append(primary_vec)

            # Remaining models: embed the cropped face directly (skip detect).
            crop = self._crop(original, area) if original is not None else None
            other_models_ok = True
            for model_name in self.models[1:]:
                if crop is None:
                    other_models_ok = False
                    break
                emb = _embed_with_model(crop, model_name, align=False)
                if emb is None:
                    other_models_ok = False
                    break
                vec = np.array(emb, dtype=np.float32)
                if self.use_tta:
                    flipped = crop[:, ::-1, :]
                    tta_emb = _embed_with_model(flipped, model_name, align=False)
                    if tta_emb is not None:
                        vec = (vec + np.array(tta_emb, dtype=np.float32)) / 2.0
                per_model_vectors.append(vec)

            if not other_models_ok:
                # Skip this face entirely; partial embeddings would corrupt the
                # FAISS index (different length than expected dimension).
                continue

            combined = np.concatenate(per_model_vectors).astype(np.float32)
            combined = self._l2_normalize(combined)

            results.append({
                "facial_area": area,
                "embedding": combined,
                "confidence": confidence,
            })

        return results

    # --- Embedding for a pre-detected crop (used by re-embed migration) ------

    def embed_crop(self, crop_rgb: np.ndarray) -> Optional[np.ndarray]:
        """Embed an already-aligned RGB face crop through the pipeline.

        Returns None if any model fails — partial embeddings must not be
        written to the index.
        """
        per_model_vectors: List[np.ndarray] = []
        for model_name in self.models:
            emb = _embed_with_model(crop_rgb, model_name, align=False)
            if emb is None:
                return None
            vec = np.array(emb, dtype=np.float32)
            if self.use_tta:
                flipped = crop_rgb[:, ::-1, :]
                tta_emb = _embed_with_model(flipped, model_name, align=False)
                if tta_emb is not None:
                    vec = (vec + np.array(tta_emb, dtype=np.float32)) / 2.0
            per_model_vectors.append(vec)
        combined = np.concatenate(per_model_vectors).astype(np.float32)
        return self._l2_normalize(combined)

    # --- Helpers --------------------------------------------------------------

    @staticmethod
    def _l2_normalize(vec: np.ndarray) -> np.ndarray:
        norm = np.linalg.norm(vec)
        if norm == 0:
            return vec
        return (vec / norm).astype(np.float32)

    @staticmethod
    def _load_rgb(image_path: str) -> Optional[np.ndarray]:
        from PIL import Image as PILImage
        try:
            img = PILImage.open(image_path)
            if img.mode != "RGB":
                img = img.convert("RGB")
            return np.array(img)
        except Exception as e:
            print(f"[embedding_pipeline] image load failed: {e}")
            return None

    @staticmethod
    def _crop(image: Optional[np.ndarray], area: dict) -> Optional[np.ndarray]:
        if image is None:
            return None
        x = int(area.get("x", 0))
        y = int(area.get("y", 0))
        w = int(area.get("w", 0))
        h = int(area.get("h", 0))
        if w <= 0 or h <= 0:
            return None
        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(image.shape[1], x + w)
        y2 = min(image.shape[0], y + h)
        if x2 <= x1 or y2 <= y1:
            return None
        return image[y1:y2, x1:x2]

    @classmethod
    def _flip_crop(cls, image: np.ndarray, area: dict) -> Optional[np.ndarray]:
        crop = cls._crop(image, area)
        if crop is None:
            return None
        return crop[:, ::-1, :]


# Module-level singleton used by face_service and vector_service.
embedding_pipeline = EmbeddingPipeline(
    models=settings.EMBEDDING_MODELS,
    use_tta=settings.USE_TTA,
    detector_backend=settings.DETECTOR_BACKEND,
)
