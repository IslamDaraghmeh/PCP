from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Cluster, Face, Person, User, UserRole
from app.schemas import (
    ClusterCreate, ClusterUpdate, ClusterResponse,
    ClusterWithFaces, ClusteringResult
)
from app.services import clustering_service
from app.routers.auth import get_current_user, require_role

router = APIRouter(prefix="/clusters", tags=["Clusters"])


@router.post("/run", response_model=ClusteringResult)
def run_clustering(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ANALYST]))
):
    """
    Run face clustering on all faces in the database.
    Requires ADMIN or ANALYST role.
    """
    result = clustering_service.cluster_faces(db)
    return ClusteringResult(**result)


@router.get("/", response_model=List[ClusterResponse])
def list_clusters(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all clusters."""
    clusters = db.query(Cluster).offset(skip).limit(limit).all()

    result = []
    for cluster in clusters:
        person_name = None
        if cluster.person_id:
            person = db.query(Person).filter(Person.id == cluster.person_id).first()
            if person:
                person_name = person.name

        rep_face_path = None
        if cluster.representative_face_id:
            rep_face = db.query(Face).filter(Face.id == cluster.representative_face_id).first()
            if rep_face:
                rep_face_path = rep_face.face_image_path

        result.append(ClusterResponse(
            id=cluster.id,
            name=cluster.name,
            description=cluster.description,
            person_id=cluster.person_id,
            person_name=person_name,
            face_count=cluster.face_count,
            representative_face_path=rep_face_path,
            created_at=cluster.created_at
        ))

    return result


@router.get("/{cluster_id}", response_model=ClusterWithFaces)
def get_cluster(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a cluster with its faces."""
    cluster = db.query(Cluster).filter(Cluster.id == cluster_id).first()

    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cluster not found"
        )

    person_name = None
    if cluster.person_id:
        person = db.query(Person).filter(Person.id == cluster.person_id).first()
        if person:
            person_name = person.name

    rep_face_path = None
    if cluster.representative_face_id:
        rep_face = db.query(Face).filter(Face.id == cluster.representative_face_id).first()
        if rep_face:
            rep_face_path = rep_face.face_image_path

    faces = db.query(Face).filter(Face.cluster_id == cluster_id).all()
    face_list = []
    for face in faces:
        face_list.append({
            "id": face.id,
            "image_id": face.image_id,
            "face_image_path": face.face_image_path,
            "confidence": face.confidence
        })

    return ClusterWithFaces(
        id=cluster.id,
        name=cluster.name,
        description=cluster.description,
        person_id=cluster.person_id,
        person_name=person_name,
        face_count=cluster.face_count,
        representative_face_path=rep_face_path,
        created_at=cluster.created_at,
        faces=face_list
    )


@router.put("/{cluster_id}", response_model=ClusterResponse)
def update_cluster(
    cluster_id: int,
    cluster_data: ClusterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a cluster's information."""
    cluster = db.query(Cluster).filter(Cluster.id == cluster_id).first()

    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cluster not found"
        )

    if cluster_data.name is not None:
        cluster.name = cluster_data.name
    if cluster_data.description is not None:
        cluster.description = cluster_data.description
    if cluster_data.person_id is not None:
        # Verify person exists
        person = db.query(Person).filter(Person.id == cluster_data.person_id).first()
        if not person:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Person not found"
            )
        cluster.person_id = cluster_data.person_id

        # Also assign all faces in this cluster to the person
        db.query(Face).filter(Face.cluster_id == cluster_id).update(
            {"person_id": cluster_data.person_id}
        )

    db.commit()
    db.refresh(cluster)

    person_name = None
    if cluster.person_id:
        person = db.query(Person).filter(Person.id == cluster.person_id).first()
        if person:
            person_name = person.name

    rep_face_path = None
    if cluster.representative_face_id:
        rep_face = db.query(Face).filter(Face.id == cluster.representative_face_id).first()
        if rep_face:
            rep_face_path = rep_face.face_image_path

    return ClusterResponse(
        id=cluster.id,
        name=cluster.name,
        description=cluster.description,
        person_id=cluster.person_id,
        person_name=person_name,
        face_count=cluster.face_count,
        representative_face_path=rep_face_path,
        created_at=cluster.created_at
    )


@router.delete("/{cluster_id}")
def delete_cluster(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ANALYST]))
):
    """Delete a cluster. Requires ADMIN or ANALYST role."""
    cluster = db.query(Cluster).filter(Cluster.id == cluster_id).first()

    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cluster not found"
        )

    # Unassign faces from this cluster
    db.query(Face).filter(Face.cluster_id == cluster_id).update({"cluster_id": None})

    db.delete(cluster)
    db.commit()

    return {"message": "Cluster deleted successfully"}
