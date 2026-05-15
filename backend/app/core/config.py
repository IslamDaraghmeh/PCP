from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Face Recognition & Clustering System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production-minimum-32-characters"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite:///./data/face_recognition.db"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"]

    # Upload settings
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png"]

    # Face Recognition settings
    FACE_MODEL: str = "Facenet512"
    DETECTOR_BACKEND: str = "retinaface"

    # Embedding pipeline — list of DeepFace model names; the pipeline
    # concatenates per-model embeddings into a single vector. USE_TTA also
    # averages each model with its horizontal-flip embedding. After changing
    # either of these, run `python -m scripts.reembed` and the FAISS index
    # will be rebuilt with the new dimension.
    # Facenet512 + ArcFace ensemble (1024-d concat) with TTA (horizontal flip
    # average per model). Typical +2-4pp accuracy lift vs Facenet512 alone.
    # After changing this, run scripts/reembed.py on the server.
    EMBEDDING_MODELS: List[str] = ["Facenet512", "ArcFace"]
    USE_TTA: bool = True
    # Facenet512 cosine-distance threshold for "same person" is ~0.30
    # (cosine similarity > 0.70). Looser values merge different people.
    SIMILARITY_THRESHOLD: float = 0.70
    CLUSTERING_EPS: float = 0.30
    CLUSTERING_MIN_SAMPLES: int = 2

    class Config:
        case_sensitive = True

settings = Settings()


# User-facing strictness presets for /clusters/run and /faces/search.
# Each request can pick a preset instead of remembering raw threshold values.
# Keep keys lowercase; the API validates against this dict's keys.
STRICTNESS_PRESETS = {
    "strict":   {"eps": 0.25, "similarity_threshold": 0.78},
    "balanced": {"eps": 0.30, "similarity_threshold": 0.70},
    "loose":    {"eps": 0.35, "similarity_threshold": 0.62},
}
