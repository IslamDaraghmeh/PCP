from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Cluster(Base):
    __tablename__ = "clusters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    description = Column(Text)
    person_id = Column(Integer, ForeignKey("persons.id"), nullable=True)
    face_count = Column(Integer, default=0)
    representative_face_id = Column(Integer)  # The most central face in the cluster
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    faces = relationship("Face", back_populates="cluster")
    person = relationship("Person")
