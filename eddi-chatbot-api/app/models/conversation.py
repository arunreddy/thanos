import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .base import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Conversation metadata
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="active", index=True)
    topic = Column(String(100), nullable=True, index=True)  # e.g., 'database_setup', 'query_optimization'
    
    # Conversation analytics
    message_count = Column(Integer, nullable=False, default=0)
    
    # Flexible metadata storage
    conversation_metadata = Column(JSONB, nullable=False, default=lambda: {})
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_message_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")

    # Constraints
    __table_args__ = (
        CheckConstraint("status IN ('active', 'archived', 'deleted')", name="check_conversation_status"),
    )

    def __repr__(self):
        return f"<Conversation(id={self.id}, title='{self.title}', status='{self.status}')>"

    def to_dict(self, include_preview=True):
        """Convert conversation to dictionary for API responses"""
        result = {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "topic": self.topic,
            "message_count": self.message_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_message_at": self.last_message_at.isoformat() if self.last_message_at else None,
        }
        
        if include_preview and self.messages:
            # Get the last assistant message for preview
            last_message = None
            for msg in reversed(self.messages):
                if msg.role == "assistant":
                    last_message = msg
                    break
            
            if last_message:
                preview = last_message.content[:100]
                if len(last_message.content) > 100:
                    preview += "..."
                result["last_message_preview"] = preview
        
        return result

