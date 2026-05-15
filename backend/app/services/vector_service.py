import os
import numpy as np
import faiss
from typing import List, Tuple, Optional
import pickle

from app.core.config import settings
from app.services.embedding_pipeline import embedding_pipeline


class VectorService:
    def __init__(self):
        self.index_path = os.path.join(
            os.path.dirname(settings.UPLOAD_DIR), "data", "faiss_index.bin"
        )
        self.id_map_path = os.path.join(
            os.path.dirname(settings.UPLOAD_DIR), "data", "id_map.pkl"
        )
        # Dimension is dictated by the configured embedding pipeline. After
        # swapping EMBEDDING_MODELS / USE_TTA the on-disk index will have the
        # wrong dimension; we detect that on load and start fresh so the new
        # vectors can be added (the reembed script repopulates).
        self.dimension = embedding_pipeline.dimension
        self.index = None
        self.id_map = []  # Maps FAISS index positions to database face IDs
        self._load_or_create_index()

    def _load_or_create_index(self):
        """Load existing index or create a new one."""
        if os.path.exists(self.index_path) and os.path.exists(self.id_map_path):
            try:
                loaded = faiss.read_index(self.index_path)
                if loaded.d != self.dimension:
                    print(
                        f"[vector_service] index dimension {loaded.d} != pipeline "
                        f"dimension {self.dimension}; discarding stale index. "
                        f"Run scripts/reembed.py to rebuild."
                    )
                    self._create_new_index()
                    return
                self.index = loaded
                with open(self.id_map_path, 'rb') as f:
                    self.id_map = pickle.load(f)
            except Exception as e:
                print(f"Error loading index: {e}")
                self._create_new_index()
        else:
            self._create_new_index()

    def _create_new_index(self):
        """Create a new FAISS index."""
        # Using IndexFlatIP for cosine similarity (after L2 normalization)
        self.index = faiss.IndexFlatIP(self.dimension)
        self.id_map = []

    def add_embedding(self, face_id: int, embedding: np.ndarray):
        """Add a single embedding to the index."""
        # Normalize for cosine similarity
        embedding = embedding.astype(np.float32)
        faiss.normalize_L2(embedding.reshape(1, -1))

        self.index.add(embedding.reshape(1, -1))
        self.id_map.append(face_id)
        self._save_index()

    def add_embeddings(self, face_ids: List[int], embeddings: np.ndarray):
        """Add multiple embeddings to the index."""
        if len(face_ids) == 0:
            return

        embeddings = embeddings.astype(np.float32)
        faiss.normalize_L2(embeddings)

        self.index.add(embeddings)
        self.id_map.extend(face_ids)
        self._save_index()

    def search(self, query_embedding: np.ndarray, k: int = 10, threshold: float = None) -> List[Tuple[int, float]]:
        """
        Search for similar faces.
        Returns list of (face_id, similarity_score) tuples sorted by similarity desc.
        """
        if self.index.ntotal == 0:
            return []

        threshold = threshold if threshold is not None else settings.SIMILARITY_THRESHOLD

        # Normalize query
        query = query_embedding.astype(np.float32).reshape(1, -1)
        faiss.normalize_L2(query)

        # Pull more candidates than the caller asked for, then threshold-filter.
        # FAISS top-k by score already gives the best matches, but if the caller
        # later dedupes by image/person, a tight k can drop valid matches before
        # the dedupe step ever sees them. Over-fetching here is cheap (FlatIP).
        search_k = min(max(k * 5, 50), self.index.ntotal)
        distances, indices = self.index.search(query, search_k)

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0 or idx >= len(self.id_map):
                continue
            similarity = float(dist)  # Already cosine similarity due to IP
            if similarity >= threshold:
                results.append((self.id_map[idx], similarity))

        # FAISS already returns in score order, but be explicit so downstream
        # dedupe code can rely on it.
        results.sort(key=lambda r: r[1], reverse=True)
        return results

    def remove_embedding(self, face_id: int):
        """
        Remove an embedding from the index.

        IndexFlatIP has no in-place delete, so we reconstruct the surviving
        embeddings and rebuild the index. The previous implementation only
        popped from id_map, leaving the FAISS positions unchanged — which
        silently corrupted the position↔face_id mapping after every delete.
        """
        if face_id not in self.id_map:
            return

        if self.index.ntotal == 0:
            self.id_map = []
            self._save_index()
            return

        all_embeddings = self.index.reconstruct_n(0, self.index.ntotal)
        keep_mask = [fid != face_id for fid in self.id_map]
        kept_ids = [fid for fid, keep in zip(self.id_map, keep_mask) if keep]
        kept_embeddings = all_embeddings[keep_mask] if any(keep_mask) else np.empty(
            (0, self.dimension), dtype=np.float32
        )

        self._create_new_index()
        if len(kept_ids) > 0:
            # Embeddings are already L2-normalized in the index; add directly.
            self.index.add(kept_embeddings)
            self.id_map = kept_ids
        self._save_index()

    def rebuild_index(self, face_ids: List[int], embeddings: np.ndarray):
        """Rebuild the entire index with new data."""
        self._create_new_index()
        if len(face_ids) > 0:
            self.add_embeddings(face_ids, embeddings)

    def _save_index(self):
        """Save index to disk."""
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
        faiss.write_index(self.index, self.index_path)
        with open(self.id_map_path, 'wb') as f:
            pickle.dump(self.id_map, f)

    def get_all_embeddings(self) -> Tuple[List[int], np.ndarray]:
        """Get all embeddings from the index."""
        if self.index.ntotal == 0:
            return [], np.array([])

        embeddings = self.index.reconstruct_n(0, self.index.ntotal)
        return self.id_map.copy(), embeddings


vector_service = VectorService()
