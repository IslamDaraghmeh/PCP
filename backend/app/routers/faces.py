import os
import shutil
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models import Face, Image, Person, User
from app.schemas import FaceResponse, FaceSearchResult, FaceSearchResponse
from app.services import face_service, vector_service
from app.routers.auth import get_current_user

router = APIRouter(prefix="/faces", tags=["Faces"])


@router.get("/", response_model=List[FaceResponse])
def list_faces(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all detected faces."""
    faces = db.query(Face).offset(skip).limit(limit).all()
    return faces


@router.get("/{face_id}", response_model=FaceResponse)
def get_face(
    face_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific face by ID."""
    face = db.query(Face).filter(Face.id == face_id).first()

    if not face:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Face not found"
        )

    return face


@router.post("/search", response_model=FaceSearchResponse)
async def search_faces(
    file: UploadFile = File(...),
    limit: int = 20,
    threshold: float = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search for similar faces by uploading a face image.
    Returns matching faces with similarity scores.
    """

    # Validate file
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type"
        )

    # Save temporary file
    temp_filename = f"search_{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(settings.UPLOAD_DIR, temp_filename)

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Detect faces in query image
        detected_faces = face_service.detect_faces(temp_path)

        if not detected_faces:
            return FaceSearchResponse(
                query_faces_detected=0,
                results=[],
                total_matches=0
            )

        # Use first detected face for search
        query_embedding = detected_faces[0]["embedding"]

        # Search in vector index
        search_results = vector_service.search(
            query_embedding, k=limit, threshold=threshold
        )

        results = []
        for face_id, similarity in search_results:
            face = db.query(Face).filter(Face.id == face_id).first()
            if face:
                image = db.query(Image).filter(Image.id == face.image_id).first()
                person = None
                if face.person_id:
                    person = db.query(Person).filter(Person.id == face.person_id).first()

                results.append(FaceSearchResult(
                    face_id=face.id,
                    image_id=face.image_id,
                    person_id=face.person_id,
                    person_name=person.name if person else None,
                    similarity_score=round(similarity, 4),
                    face_image_path=face.face_image_path,
                    source_image_path=image.file_path if image else None
                ))

        return FaceSearchResponse(
            query_faces_detected=len(detected_faces),
            results=results,
            total_matches=len(results)
        )

    finally:
        # Clean up temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.put("/{face_id}/assign-person")
def assign_face_to_person(
    face_id: int,
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign a face to a person."""
    face = db.query(Face).filter(Face.id == face_id).first()
    if not face:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Face not found"
        )

    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person not found"
        )

    face.person_id = person_id
    db.commit()

    return {"message": f"Face assigned to person: {person.name}"}


@router.delete("/{face_id}/assign-person")
def unassign_face_from_person(
    face_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove face from person assignment."""
    face = db.query(Face).filter(Face.id == face_id).first()
    if not face:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Face not found"
        )

    face.person_id = None
    db.commit()

    return {"message": "Face unassigned from person"}
