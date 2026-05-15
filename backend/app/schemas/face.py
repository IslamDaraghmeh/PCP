from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class FaceBase(BaseModel):
    pass


class FaceResponse(BaseModel):
    id: int
    image_id: int
    person_id: Optional[int] = None
    cluster_id: Optional[int] = None
    bbox_x: Optional[int] = None
    bbox_y: Optional[int] = None
    bbox_width: Optional[int] = None
    bbox_height: Optional[int] = None
    confidence: Optional[float] = None
    face_image_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FaceSearchResult(BaseModel):
    face_id: int
    image_id: int
    person_id: Optional[int] = None
    person_name: Optional[str] = None
    similarity_score: float
    face_image_path: Optional[str] = None
    source_image_path: Optional[str] = None


class FaceSearchResponse(BaseModel):
    query_faces_detected: int
    results: List[FaceSearchResult]
    total_matches: int
