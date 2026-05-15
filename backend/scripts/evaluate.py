"""
Measure same-person vs different-person cosine similarity distribution
under the currently-configured embedding pipeline. Use this to pick
SIMILARITY_THRESHOLD and CLUSTERING_EPS after switching models.

Reads ground truth from face.person_id: faces with the same person_id are
"same person", faces with different person_ids are "different person".
You need at least 2 labeled people with 2+ faces each for the report to
be useful.

    docker compose exec backend python -m scripts.evaluate

Output prints:
  - Same-person pair count + cosine summary (min / mean / max)
  - Different-person pair count + cosine summary
  - Suggested threshold = midpoint between max-different and min-same
  - Optional histogram-ish breakdown by bucket
"""
import sys
from collections import defaultdict
from itertools import combinations
from typing import List

import numpy as np

from app.core.database import SessionLocal
from app.models.face import Face
from app.services.face_service import face_service


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    na = np.linalg.norm(a); nb = np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def _bucket(scores: List[float]) -> str:
    if not scores:
        return "(none)"
    edges = [0.3, 0.4, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.01]
    counts = [0] * (len(edges) - 1)
    for s in scores:
        for i in range(len(edges) - 1):
            if edges[i] <= s < edges[i + 1]:
                counts[i] += 1
                break
    parts = []
    for i, c in enumerate(counts):
        if c == 0:
            continue
        parts.append(f"[{edges[i]:.2f}-{edges[i+1]:.2f}):{c}")
    return " ".join(parts) or "(none)"


def main() -> int:
    db = SessionLocal()
    try:
        labeled = (
            db.query(Face)
            .filter(Face.person_id.isnot(None), Face.embedding.isnot(None))
            .all()
        )
        if len(labeled) < 4:
            print("Not enough labeled faces (need >= 4 with person_id set).")
            return 1

        # Group by person.
        by_person: dict = defaultdict(list)
        for f in labeled:
            emb = face_service.deserialize_embedding(f.embedding)
            by_person[f.person_id].append((f.id, emb))

        print(f"Labeled faces: {len(labeled)} across {len(by_person)} person(s)")
        for pid, faces in by_person.items():
            print(f"  person {pid}: {len(faces)} face(s)")
        print()

        same_scores: List[float] = []
        diff_scores: List[float] = []

        # Same-person pairs.
        for faces in by_person.values():
            for (a_id, a_emb), (b_id, b_emb) in combinations(faces, 2):
                same_scores.append(_cosine(a_emb, b_emb))

        # Different-person pairs.
        persons = list(by_person.items())
        for i in range(len(persons)):
            for j in range(i + 1, len(persons)):
                for _, ea in persons[i][1]:
                    for _, eb in persons[j][1]:
                        diff_scores.append(_cosine(ea, eb))

        def stat(label, arr):
            if not arr:
                print(f"{label}: (no pairs)")
                return
            arr = np.array(arr)
            print(
                f"{label}: n={len(arr)} | min={arr.min():.4f} "
                f"mean={arr.mean():.4f} max={arr.max():.4f}"
            )
            print(f"  buckets: {_bucket(arr.tolist())}")

        stat("Same-person pairs    ", same_scores)
        stat("Different-person pairs", diff_scores)
        print()

        if same_scores and diff_scores:
            min_same = min(same_scores)
            max_diff = max(diff_scores)
            gap = min_same - max_diff
            print(f"min(same)={min_same:.4f}   max(diff)={max_diff:.4f}   gap={gap:+.4f}")
            if gap > 0:
                suggested = (min_same + max_diff) / 2.0
                print(
                    f"Suggested SIMILARITY_THRESHOLD ≈ {suggested:.3f} "
                    f"(midpoint between max-diff and min-same)"
                )
                print(
                    f"Suggested CLUSTERING_EPS       ≈ {1 - suggested:.3f} "
                    f"(1 - suggested similarity = cosine distance)"
                )
            else:
                print(
                    "WARNING: same/different distributions OVERLAP — there is no "
                    "single threshold that separates them perfectly. Consider:"
                )
                print(
                    "  - Removing mislabeled faces in the overlap region "
                    "(they may be wrong assignments, not model error)"
                )
                print(
                    "  - Tightening MIN_FACE_CONFIDENCE / MIN_FACE_SIZE_PX in face_service.py"
                )
                print(
                    "  - Trying a different / stronger embedding pipeline "
                    "(Phase D: InsightFace)"
                )
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
