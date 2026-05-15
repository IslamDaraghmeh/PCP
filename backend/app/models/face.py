from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Face(Base):
    __tablename__ = "faces"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id"), nullable=False)
    person_id = Column(Integer, ForeignKey("persons.id"), nullable=True)
    cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=True)

    # Face bounding box coordinates
    bbox_x = Column(Integer)
    bbox_y = Column(Integer)
    bbox_width = Column(Integer)
    bbox_height = Column(Integer)

    # Face embedding (stored as binary for efficiency)
    embedding = Column(LargeBinary)

    # Confidence score from detection
    confidence = Column(Float)

    # Path to cropped face image
    face_image_path = Column(String(500))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    image = relationship("Image", back_populates="faces")
    person = relationship("Person", back_populates="faces")
    cluster = relationship("Cluster", back_populates="faces")
