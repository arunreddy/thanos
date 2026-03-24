import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base


class MessageFeedback(Base):
    __tablename__ = "message_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Feedback data
    feedback_type = Column(String(10), nullable=False)  # 'positive' or 'negative'
    category = Column(String(50), nullable=True)  # Negative feedback category
    comment = Column(Text, nullable=True)  # Optional free-text details

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    message = relationship("Message")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_user_feedback"),
        CheckConstraint("feedback_type IN ('positive', 'negative')", name="check_feedback_type"),
    )

    def __repr__(self):
        return f"<MessageFeedback(id={self.id}, type='{self.feedback_type}', message_id={self.message_id})>"

    def to_dict(self):
        return {
            "id": str(self.id),
            "message_id": str(self.message_id),
            "user_id": str(self.user_id),
            "feedback_type": self.feedback_type,
            "category": self.category,
            "comment": self.comment,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
