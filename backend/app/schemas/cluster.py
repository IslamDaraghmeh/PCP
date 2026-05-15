from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ClusterBase(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ClusterCreate(ClusterBase):
    pass


class ClusterUpdate(ClusterBase):
    person_id: Optional[int] = None


class ClusterResponse(BaseModel):
    id: int
    name: Optional[str] = None
    description: Optional[str] = None
    person_id: Optional[int] = None
    person_name: Optional[str] = None
    face_count: int
    representative_face_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ClusterWithFaces(ClusterResponse):
    faces: List[dict] = []


class ClusteringResult(BaseModel):
    total_faces: int
    clusters_created: int
    noise_faces: int  # Faces that couldn't be clustered
    message: str
