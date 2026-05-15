import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Person, Face, User
from app.schemas import PersonCreate, PersonUpdate, PersonResponse, PersonWithFaces
from app.routers.auth import get_current_user

router = APIRouter(prefix="/persons", tags=["Persons"])


@router.post("/", response_model=PersonResponse)
def create_person(
    person_data: PersonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new person identity."""
    person = Person(
        name=person_data.name,
        description=person_data.description,
        metadata_json=json.dumps(person_data.metadata) if person_data.metadata else None
    )
    db.add(person)
    db.commit()
    db.refresh(person)

    return PersonResponse(
        id=person.id,
        name=person.name,
        description=person.description,
        face_count=0,
        created_at=person.created_at,
        updated_at=person.updated_at
    )


@router.get("/", response_model=List[PersonResponse])
def list_persons(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all persons."""
    persons = db.query(Person).offset(skip).limit(limit).all()

    result = []
    for person in persons:
        face_count = db.query(Face).filter(Face.person_id == person.id).count()
        result.append(PersonResponse(
            id=person.id,
            name=person.name,
            description=person.description,
            face_count=face_count,
            created_at=person.created_at,
            updated_at=person.updated_at
        ))

    return result


@router.get("/{person_id}", response_model=PersonWithFaces)
def get_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a person with their faces."""
    person = db.query(Person).filter(Person.id == person_id).first()

    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person not found"
        )

    faces = db.query(Face).filter(Face.person_id == person_id).all()
    face_count = len(faces)

    face_list = []
    for face in faces:
        face_list.append({
            "id": face.id,
            "image_id": face.image_id,
            "face_image_path": face.face_image_path,
            "confidence": face.confidence
        })

    return PersonWithFaces(
        id=person.id,
        name=person.name,
        description=person.description,
        face_count=face_count,
        created_at=person.created_at,
        updated_at=person.updated_at,
        faces=face_list
    )


@router.put("/{person_id}", response_model=PersonResponse)
def update_person(
    person_id: int,
    person_data: PersonUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a person's information."""
    person = db.query(Person).filter(Person.id == person_id).first()

    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person not found"
        )

    if person_data.name is not None:
        person.name = person_data.name
    if person_data.description is not None:
        person.description = person_data.description
    if person_data.metadata is not None:
        person.metadata_json = json.dumps(person_data.metadata)

    db.commit()
    db.refresh(person)

    face_count = db.query(Face).filter(Face.person_id == person_id).count()

    return PersonResponse(
        id=person.id,
        name=person.name,
        description=person.description,
        face_count=face_count,
        created_at=person.created_at,
        updated_at=person.updated_at
    )


@router.delete("/{person_id}")
def delete_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a person."""
    person = db.query(Person).filter(Person.id == person_id).first()

    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person not found"
        )

    # Unassign faces from this person
    db.query(Face).filter(Face.person_id == person_id).update({"person_id": None})

    db.delete(person)
    db.commit()

    return {"message": "Person deleted successfully"}
