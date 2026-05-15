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
    # Facenet512 cosine-distance threshold for "same person" is ~0.30
    # (cosine similarity > 0.70). Looser values merge different people.
    SIMILARITY_THRESHOLD: float = 0.70
    CLUSTERING_EPS: float = 0.30
    CLUSTERING_MIN_SAMPLES: int = 2

    class Config:
        case_sensitive = True

settings = Settings()
