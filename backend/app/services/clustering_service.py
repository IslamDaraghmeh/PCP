import numpy as np
from typing import List, Dict, Tuple
import hdbscan
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Face, Cluster
from app.models.face_negative_link import FaceNegativeLink
from app.services.face_service import face_service

# Cosine distance value used to forbid merging two faces. HDBSCAN's
# cluster_selection_epsilon and any reasonable similarity threshold are well
# below 1.0, so faces with this distance are guaranteed not to be grouped.
_FORBIDDEN_DISTANCE = 2.0


class ClusteringService:
    def __init__(self):
        self.eps = settings.CLUSTERING_EPS
        self.min_samples = settings.CLUSTERING_MIN_SAMPLES

    def cluster_faces(self, db: Session, eps: float = None) -> Dict:
        """
        Perform HDBSCAN clustering on all faces in the database.
        Caller may pass an eps override (per-request strictness preset);
        falls back to the configured default.
        Returns clustering statistics.
        """
        effective_eps = eps if eps is not None else self.eps

        # Get all faces with embeddings
        faces = db.query(Face).filter(Face.embedding.isnot(None)).all()

        if len(faces) < self.min_samples:
            return {
                "total_faces": len(faces),
                "clusters_created": 0,
                "noise_faces": len(faces),
                "message": "Not enough faces for clustering"
            }

        # Extract embeddings
        face_ids = []
        embeddings = []

        for face in faces:
            face_ids.append(face.id)
            emb = face_service.deserialize_embedding(face.embedding)
            embeddings.append(emb)

        embeddings = np.array(embeddings)

        # Normalize embeddings for cosine distance
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1
        embeddings_normalized = embeddings / norms

        # Build cosine distance matrix from normalized embeddings.
        # HDBSCAN with a precomputed distance matrix requires float64.
        similarity_matrix = np.dot(embeddings_normalized, embeddings_normalized.T)
        distance_matrix = 1 - similarity_matrix
        distance_matrix = np.clip(distance_matrix, 0, 2).astype(np.float64)

        # Apply user-asserted negative links: force the distance between
        # disallowed pairs to a value well above any merge threshold, so
        # HDBSCAN cannot put them in the same cluster regardless of how
        # similar their embeddings happen to be.
        face_id_to_idx = {fid: i for i, fid in enumerate(face_ids)}
        negative_links = db.query(FaceNegativeLink).all()
        for link in negative_links:
            ia = face_id_to_idx.get(link.face_a_id)
            ib = face_id_to_idx.get(link.face_b_id)
            if ia is None or ib is None:
                continue
            distance_matrix[ia, ib] = _FORBIDDEN_DISTANCE
            distance_matrix[ib, ia] = _FORBIDDEN_DISTANCE

        # HDBSCAN auto-adapts density per cluster — better than DBSCAN's single
        # global eps when different people have different intra-class spread.
        # cluster_selection_epsilon enforces a minimum cosine-distance gap so
        # clearly-similar faces (e.g. near-duplicates) always merge.
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=2,
            min_samples=1,
            metric='precomputed',
            cluster_selection_method='leaf',
            cluster_selection_epsilon=effective_eps,
            allow_single_cluster=False,
        )
        labels = clusterer.fit_predict(distance_matrix)

        # Snapshot current face → person mapping so we can restore person_id
        # on the new clusters when re-clustering (face.person_id is preserved;
        # cluster.person_id needs to be re-derived).
        face_person_map = {f.id: f.person_id for f in faces}

        # Clear existing clusters
        db.query(Cluster).delete()

        # Update faces with cluster assignments
        for face in faces:
            face.cluster_id = None
        db.commit()

        # Build cluster groups: density-based clusters + singletons for noise.
        # Every face must end up in some cluster so the UI can show and label it.
        groups: List[List[int]] = []
        unique_labels = sorted(l for l in set(labels) if l != -1)
        for label in unique_labels:
            groups.append(list(np.where(labels == label)[0]))
        # One singleton group per noise face
        noise_indices = list(np.where(labels == -1)[0])
        for idx in noise_indices:
            groups.append([idx])

        clusters_created = 0
        for group_num, cluster_face_indices in enumerate(groups, start=1):
            cluster_face_ids = [face_ids[i] for i in cluster_face_indices]

            # Inherit person_id only when every labeled face agrees on one
            # person. Mixed labels → leave unassigned so the user re-confirms.
            labeled_persons = {
                face_person_map.get(fid)
                for fid in cluster_face_ids
                if face_person_map.get(fid) is not None
            }
            inherited_person_id = labeled_persons.pop() if len(labeled_persons) == 1 else None

            cluster = Cluster(
                name=f"Cluster {group_num}",
                face_count=len(cluster_face_ids),
                person_id=inherited_person_id,
            )
            db.add(cluster)
            db.flush()

            # Find representative face (closest to centroid); singletons have one face
            cluster_embeddings = embeddings[cluster_face_indices]
            if len(cluster_face_indices) == 1:
                representative_idx = cluster_face_indices[0]
            else:
                centroid = np.mean(cluster_embeddings, axis=0)
                distances = np.linalg.norm(cluster_embeddings - centroid, axis=1)
                representative_idx = cluster_face_indices[np.argmin(distances)]
            cluster.representative_face_id = face_ids[representative_idx]

            # Update faces with cluster assignment
            for face_id in cluster_face_ids:
                face = db.query(Face).filter(Face.id == face_id).first()
                if face:
                    face.cluster_id = cluster.id

            clusters_created += 1

        # Now every face is in a cluster; report 0 noise faces.
        noise_count = 0

        db.commit()

        return {
            "total_faces": len(faces),
            "clusters_created": clusters_created,
            "noise_faces": int(noise_count),
            "message": f"Successfully created {clusters_created} clusters"
        }

    def assign_face_to_cluster(self, db: Session, face_id: int) -> int:
        """
        Assign a single face to the most similar existing cluster.
        Returns the cluster ID or -1 if no suitable cluster found.
        """
        face = db.query(Face).filter(Face.id == face_id).first()
        if not face or not face.embedding:
            return -1

        face_embedding = face_service.deserialize_embedding(face.embedding)

        # Get all clusters with their representative faces
        clusters = db.query(Cluster).all()

        best_cluster_id = -1
        best_similarity = settings.SIMILARITY_THRESHOLD

        for cluster in clusters:
            if cluster.representative_face_id:
                rep_face = db.query(Face).filter(
                    Face.id == cluster.representative_face_id
                ).first()

                if rep_face and rep_face.embedding:
                    rep_embedding = face_service.deserialize_embedding(rep_face.embedding)
                    similarity = face_service.calculate_similarity(
                        face_embedding, rep_embedding
                    )

                    if similarity > best_similarity:
                        best_similarity = similarity
                        best_cluster_id = cluster.id

        if best_cluster_id > 0:
            face.cluster_id = best_cluster_id
            cluster = db.query(Cluster).filter(Cluster.id == best_cluster_id).first()
            if cluster:
                cluster.face_count += 1
            db.commit()

        return best_cluster_id


clustering_service = ClusteringService()
