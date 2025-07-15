import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, Numeric, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .base import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False, index=True)
    
    # Message content
    role = Column(String(20), nullable=False, index=True)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    
    # Model and processing metadata
    model_used = Column(String(100), nullable=True, index=True)  # 'rasa', 'gpt-4', 'claude-3', etc.
    intent_name = Column(String(255), nullable=True, index=True)  # Rasa intent or LLM-classified intent
    confidence_score = Column(Numeric(3, 2), nullable=True)  # 0.00 to 1.00
    response_time_ms = Column(Integer, nullable=True)  # Performance tracking
    
    # Interactive elements
    buttons = Column(JSONB, nullable=True)  # Button data for assistant messages
    custom_data = Column(JSONB, nullable=False, default=lambda: {})  # Form data, downloads, etc.
    
    # Message threading (for future use)
    parent_message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # Flexible metadata storage
    message_metadata = Column(JSONB, nullable=False, default=lambda: {})

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    parent_message = relationship("Message", remote_side=[id])

    # Constraints
    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant', 'system')", name="check_message_role"),
        CheckConstraint("confidence_score IS NULL OR (confidence_score >= 0.00 AND confidence_score <= 1.00)", name="check_confidence_range"),
    )

    def __repr__(self):
        content_preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"<Message(id={self.id}, role='{self.role}', content='{content_preview}')>"

    def to_dict(self):
        """Convert message to dictionary for API responses"""
        return {
            "id": str(self.id),
            "role": self.role,
            "content": self.content,
            "model_used": self.model_used,
            "intent_name": self.intent_name,
            "confidence_score": float(self.confidence_score) if self.confidence_score else None,
            "response_time_ms": self.response_time_ms,
            "buttons": self.buttons,
            "custom_data": self.custom_data,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }