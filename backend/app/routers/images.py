import os
import uuid
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from PIL import Image as PILImage

from app.core.database import get_db
from app.core.config import settings
from app.models import Image, Face, User
from app.schemas import ImageResponse, ImageUploadResponse, BulkUploadResponse
from app.services import face_service, vector_service
from app.routers.auth import get_current_user

router = APIRouter(prefix="/images", tags=["Images"])


def validate_file(file: UploadFile) -> bool:
    """Validate file extension and size."""
    ext = os.path.splitext(file.filename)[1].lower()
    return ext in settings.ALLOWED_EXTENSIONS


async def process_and_save_image(
    file: UploadFile,
    user_id: int,
    db: Session
) -> ImageUploadResponse:
    """Process uploaded image: save, detect faces, generate embeddings."""

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1].lower()
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Get image dimensions
    try:
        with PILImage.open(file_path) as img:
            width, height = img.size
    except Exception:
        width, height = None, None

    # Get file size
    file_size = os.path.getsize(file_path)

    # Create database record
    image = Image(
        filename=filename,
        original_filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type,
        width=width,
        height=height,
        uploaded_by=user_id
    )
    db.add(image)
    db.flush()

    # Detect faces
    detected_faces = face_service.detect_faces(file_path)
    faces_detected = 0

    for face_data in detected_faces:
        face = Face(
            image_id=image.id,
            bbox_x=face_data["bbox_x"],
            bbox_y=face_data["bbox_y"],
            bbox_width=face_data["bbox_width"],
            bbox_height=face_data["bbox_height"],
            embedding=face_service.serialize_embedding(face_data["embedding"]),
            confidence=face_data["confidence"],
            face_image_path=face_data["face_image_path"]
        )
        db.add(face)
        db.flush()

        # Add to vector index
        vector_service.add_embedding(face.id, face_data["embedding"])
        faces_detected += 1

    db.commit()

    return ImageUploadResponse(
        id=image.id,
        filename=filename,
        faces_detected=faces_detected,
        message=f"Successfully processed image with {faces_detected} faces detected"
    )


@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a single image for face detection."""

    if not validate_file(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    return await process_and_save_image(file, current_user.id, db)


@router.post("/upload/bulk", response_model=BulkUploadResponse)
async def bulk_upload_images(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload multiple images for face detection."""

    results = []
    successful = 0
    failed = 0

    for file in files:
        try:
            if not validate_file(file):
                results.append(ImageUploadResponse(
                    id=0,
                    filename=file.filename,
                    faces_detected=0,
                    message=f"Invalid file type"
                ))
                failed += 1
                continue

            result = await process_and_save_image(file, current_user.id, db)
            results.append(result)
            successful += 1

        except Exception as e:
            results.append(ImageUploadResponse(
                id=0,
                filename=file.filename,
                faces_detected=0,
                message=f"Error: {str(e)}"
            ))
            failed += 1

    return BulkUploadResponse(
        total_images=len(files),
        successful=successful,
        failed=failed,
        results=results
    )


@router.get("/", response_model=List[ImageResponse])
def list_images(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all uploaded images."""
    images = db.query(Image).offset(skip).limit(limit).all()

    result = []
    for img in images:
        face_count = db.query(Face).filter(Face.image_id == img.id).count()
        result.append(ImageResponse(
            id=img.id,
            filename=img.filename,
            original_filename=img.original_filename,
            file_path=img.file_path,
            file_size=img.file_size,
            mime_type=img.mime_type,
            width=img.width,
            height=img.height,
            face_count=face_count,
            created_at=img.created_at
        ))

    return result


@router.get("/{image_id}", response_model=ImageResponse)
def get_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific image by ID."""
    image = db.query(Image).filter(Image.id == image_id).first()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )

    face_count = db.query(Face).filter(Face.image_id == image.id).count()

    return ImageResponse(
        id=image.id,
        filename=image.filename,
        original_filename=image.original_filename,
        file_path=image.file_path,
        file_size=image.file_size,
        mime_type=image.mime_type,
        width=image.width,
        height=image.height,
        face_count=face_count,
        created_at=image.created_at
    )


@router.delete("/{image_id}")
def delete_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an image and its associated faces."""
    image = db.query(Image).filter(Image.id == image_id).first()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )

    # Remove face embeddings from vector index
    faces = db.query(Face).filter(Face.image_id == image_id).all()
    for face in faces:
        vector_service.remove_embedding(face.id)
        # Delete face image file
        if face.face_image_path and os.path.exists(face.face_image_path):
            os.remove(face.face_image_path)

    # Delete image file
    if os.path.exists(image.file_path):
        os.remove(image.file_path)

    # Delete from database (cascades to faces)
    db.delete(image)
    db.commit()

    return {"message": "Image deleted successfully"}
