from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class PersonBase(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class PersonCreate(PersonBase):
    pass


class PersonUpdate(PersonBase):
    pass


class PersonResponse(BaseModel):
    id: int
    name: Optional[str] = None
    description: Optional[str] = None
    face_count: Optional[int] = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PersonWithFaces(PersonResponse):
    faces: List[dict] = []
