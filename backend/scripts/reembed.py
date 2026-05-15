"""
Re-embed every face row through the currently-configured EmbeddingPipeline
and rebuild the FAISS index from scratch.

Run this once after changing `EMBEDDING_MODELS` or `USE_TTA` in config:

    docker compose exec backend python -m scripts.reembed

Strategy:
1. For each Face row, prefer embedding the saved face crop (face_image_path)
   because it preserves the exact bbox + alignment used at upload time.
2. Fall back to re-detecting from the source image when the crop is missing,
   then matching the original bbox by largest IoU.
3. Write the new embedding back to face.embedding (pickled), and after every
   face is processed rebuild the FAISS index in one shot.
4. Faces that fail to re-embed are reported, NOT silently dropped. Their old
   embedding stays in the DB; they get excluded from the FAISS index until
   you re-upload or fix the source image.

Idempotent — safe to re-run.
"""
import sys
import pickle
from typing import List, Optional

import numpy as np
from PIL import Image as PILImage

from app.core.database import SessionLocal
from app.models.face import Face
from app.models.image import Image
from app.services.embedding_pipeline import embedding_pipeline
from app.services.vector_service import vector_service


def _embed_from_crop(crop_path: str) -> Optional[np.ndarray]:
    try:
        img = PILImage.open(crop_path)
        if img.mode != "RGB":
            img = img.convert("RGB")
        crop_np = np.array(img)
    except Exception as e:
        print(f"  ! crop load failed for {crop_path}: {e}")
        return None
    return embedding_pipeline.embed_crop(crop_np)


def _iou(a, b) -> float:
    ax1, ay1, aw, ah = a
    bx1, by1, bw, bh = b
    ax2, ay2 = ax1 + aw, ay1 + ah
    bx2, by2 = bx1 + bw, by1 + bh
    ix1 = max(ax1, bx1); iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2); iy2 = min(ay2, by2)
    iw = max(0, ix2 - ix1); ih = max(0, iy2 - iy1)
    inter = iw * ih
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0


def _embed_from_source(face: Face, source_path: str) -> Optional[np.ndarray]:
    """Fallback: re-detect, find the detection matching this face's bbox, embed."""
    detected = embedding_pipeline.detect_and_embed(source_path)
    if not detected:
        return None
    target = (face.bbox_x or 0, face.bbox_y or 0, face.bbox_width or 0, face.bbox_height or 0)
    best, best_iou = None, 0.0
    for d in detected:
        area = d.get("facial_area") or {}
        candidate = (area.get("x", 0), area.get("y", 0), area.get("w", 0), area.get("h", 0))
        score = _iou(target, candidate)
        if score > best_iou:
            best, best_iou = d, score
    if best is None or best_iou < 0.3:
        return None
    return best.get("embedding")


def main() -> int:
    print(f"Pipeline: models={embedding_pipeline.models} use_tta={embedding_pipeline.use_tta}")
    print(f"Target embedding dimension: {embedding_pipeline.dimension}")

    db = SessionLocal()
    try:
        faces: List[Face] = db.query(Face).all()
        print(f"Re-embedding {len(faces)} face row(s)...")

        kept_ids: List[int] = []
        kept_vecs: List[np.ndarray] = []
        failed: List[int] = []

        for i, face in enumerate(faces, start=1):
            label = f"[{i}/{len(faces)}] face={face.id}"
            new_emb: Optional[np.ndarray] = None

            # Try the saved crop first — it preserves the original alignment.
            if face.face_image_path:
                import os
                if os.path.exists(face.face_image_path):
                    new_emb = _embed_from_crop(face.face_image_path)

            # Fall back to source image + bbox match.
            if new_emb is None:
                img = db.query(Image).filter(Image.id == face.image_id).first()
                if img and img.file_path:
                    new_emb = _embed_from_source(face, img.file_path)

            if new_emb is None:
                print(f"{label}: FAILED (no embedding produced)")
                failed.append(face.id)
                continue

            face.embedding = pickle.dumps(new_emb.astype(np.float32))
            kept_ids.append(face.id)
            kept_vecs.append(new_emb.astype(np.float32))
            print(f"{label}: ok")

        db.commit()
        print("Embeddings written to DB.")

        # Rebuild FAISS in one shot.
        if kept_vecs:
            matrix = np.vstack(kept_vecs)
            vector_service.rebuild_index(kept_ids, matrix)
        else:
            vector_service._create_new_index()
            vector_service._save_index()
        print(
            f"FAISS rebuilt: {vector_service.index.ntotal} vectors of dim "
            f"{vector_service.dimension}"
        )

        if failed:
            print(f"Skipped {len(failed)} face(s) with no usable embedding: {failed}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
