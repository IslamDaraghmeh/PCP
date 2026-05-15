from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.sql import func

from app.core.database import Base


class FaceNegativeLink(Base):
    """
    A user-asserted "these two faces are NOT the same person" relationship.

    Used by the clustering algorithm to forbid merging the two referenced
    faces (and, by extension, faces belonging to the same labeled person).
    Pairs are stored canonically with face_a_id < face_b_id so the uniqueness
    constraint catches both insertion orders.
    """
    __tablename__ = "face_negative_links"

    id = Column(Integer, primary_key=True, index=True)
    face_a_id = Column(Integer, ForeignKey("faces.id", ondelete="CASCADE"), nullable=False, index=True)
    face_b_id = Column(Integer, ForeignKey("faces.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("face_a_id", "face_b_id", name="uq_face_negative_link_pair"),
        CheckConstraint("face_a_id < face_b_id", name="ck_face_negative_link_order"),
    )

    @staticmethod
    def canonical_pair(a: int, b: int) -> tuple[int, int]:
        """Return (a, b) sorted so the smaller id is first."""
        return (a, b) if a < b else (b, a)
