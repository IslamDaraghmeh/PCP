import numpy as np
from typing import List, Dict, Tuple
import hdbscan
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Face, Cluster
from app.services.face_service import face_service


class ClusteringService:
    def __init__(self):
        self.eps = settings.CLUSTERING_EPS
        self.min_samples = settings.CLUSTERING_MIN_SAMPLES

    def cluster_faces(self, db: Session) -> Dict:
        """
        Perform DBSCAN clustering on all faces in the database.
        Returns clustering statistics.
        """
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

        # HDBSCAN auto-adapts density per cluster — better than DBSCAN's single
        # global eps when different people have different intra-class spread.
        # cluster_selection_epsilon enforces a minimum cosine-distance gap so
        # clearly-similar faces (e.g. near-duplicates) always merge.
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=2,
            min_samples=1,
            metric='precomputed',
            cluster_selection_method='leaf',
            cluster_selection_epsilon=self.eps,
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

        # Create new clusters
        unique_labels = set(labels)
        clusters_created = 0
        noise_count = 0

        for label in unique_labels:
            if label == -1:
                # Noise points
                noise_count = np.sum(labels == label)
                continue

            # Get faces in this cluster
            cluster_face_indices = np.where(labels == label)[0]
            cluster_face_ids = [face_ids[i] for i in cluster_face_indices]

            # Inherit person_id only when every labeled face agrees on one
            # person. Mixed labels → leave unassigned so the user re-confirms.
            labeled_persons = {
                face_person_map.get(fid)
                for fid in cluster_face_ids
                if face_person_map.get(fid) is not None
            }
            inherited_person_id = labeled_persons.pop() if len(labeled_persons) == 1 else None

            # Create cluster
            cluster = Cluster(
                name=f"Cluster {label + 1}",
                face_count=len(cluster_face_ids),
                person_id=inherited_person_id,
            )
            db.add(cluster)
            db.flush()

            # Find representative face (closest to centroid)
            cluster_embeddings = embeddings[cluster_face_indices]
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
