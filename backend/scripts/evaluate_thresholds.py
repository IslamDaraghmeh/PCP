"""
Inspect the cosine-similarity distribution of your current embeddings to
pick sensible CLUSTERING_EPS / SIMILARITY_THRESHOLD values.

Usage:

    docker compose exec backend python -m scripts.evaluate_thresholds

The script prints a histogram of pairwise cosine similarities for:
  - same-person pairs (faces sharing the same Face.person_id)
  - different-person pairs (faces whose Face.person_id differs and both
    are non-null)

A good threshold sits between the *max* different-pair score and the *min*
same-pair score — the wider the gap, the safer the threshold.

After changing EMBEDDING_MODELS / USE_TTA and running reembed.py, run this
script and then update STRICTNESS_PRESETS in config.py if the distribution
shifted noticeably.
"""
import sys
from collections import defaultdict
from itertools import combinations

import numpy as np

from app.core.database import SessionLocal
from app.models.face import Face
from app.services.face_service import face_service


def _bucket(score: float) -> str:
    # Buckets at 0.05 increments from 0.00 to 1.00.
    if score >= 1.0:
        return "1.00"
    if score < 0.0:
        return "<0"
    lo = int(score * 20) / 20.0
    return f"{lo:.2f}"


def _print_histogram(label: str, scores):
    if not scores:
        print(f"{label}: (no pairs)")
        return
    counts = defaultdict(int)
    for s in scores:
        counts[_bucket(s)] += 1
    print(f"\n{label} ({len(scores)} pairs, min={min(scores):.3f} max={max(scores):.3f} mean={np.mean(scores):.3f}):")
    for key in sorted(counts.keys()):
        bar = "#" * counts[key]
        print(f"  {key} | {bar} ({counts[key]})")


def main() -> int:
    db = SessionLocal()
    try:
        faces = (
            db.query(Face)
            .filter(Face.embedding.isnot(None), Face.person_id.isnot(None))
            .all()
        )
        if len(faces) < 2:
            print("Need at least 2 person-labeled faces to evaluate. Label some clusters first.")
            return 0

        embeddings = []
        person_ids = []
        for f in faces:
            emb = face_service.deserialize_embedding(f.embedding)
            n = np.linalg.norm(emb)
            embeddings.append((emb / n) if n > 0 else emb)
            person_ids.append(f.person_id)

        same, diff = [], []
        for i, j in combinations(range(len(faces)), 2):
            sim = float(np.dot(embeddings[i], embeddings[j]))
            (same if person_ids[i] == person_ids[j] else diff).append(sim)

        _print_histogram("SAME-person pairs", same)
        _print_histogram("DIFFERENT-person pairs", diff)

        if same and diff:
            gap = min(same) - max(diff)
            mid = (min(same) + max(diff)) / 2
            print(
                f"\nGap between max(different) and min(same): {gap:+.3f}"
                f"\nSuggested SIMILARITY_THRESHOLD (midpoint): {mid:.3f}"
            )
            print(
                "  - If gap is positive, the suggested midpoint is a safe threshold."
                "\n  - If gap is negative, the distributions overlap — some same-person"
                "\n    pairs are weaker than some different-person pairs (expect errors)."
            )

        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
