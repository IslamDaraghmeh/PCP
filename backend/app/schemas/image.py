from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ImageBase(BaseModel):
    original_filename: str


class ImageCreate(ImageBase):
    pass


class ImageResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_path: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    face_count: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ImageUploadResponse(BaseModel):
    id: int
    filename: str
    faces_detected: int
    message: str


class BulkUploadResponse(BaseModel):
    total_images: int
    successful: int
    failed: int
    results: List[ImageUploadResponse]
