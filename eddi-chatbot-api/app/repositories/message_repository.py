from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from app.models.message import Message
from app.models.conversation import Conversation


class MessageRepository:
    """Repository for message CRUD operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        model_used: Optional[str] = None,
        intent_name: Optional[str] = None,
        confidence_score: Optional[float] = None,
        response_time_ms: Optional[int] = None,
        buttons: Optional[list] = None,
        custom_data: Optional[dict] = None,
        message_metadata: Optional[dict] = None,
        parent_message_id: Optional[str] = None
    ) -> Message:
        """Create a new message"""
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            model_used=model_used,
            intent_name=intent_name,
            confidence_score=confidence_score,
            response_time_ms=response_time_ms,
            buttons=buttons,
            custom_data=custom_data or {},
            message_metadata=message_metadata or {},
            parent_message_id=parent_message_id
        )
        
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message
    
    def get_message_by_id(self, message_id: str) -> Optional[Message]:
        """Get message by ID"""
        return self.db.query(Message).filter(Message.id == message_id).first()
    
    def get_conversation_messages(
        self,
        conversation_id: str,
        limit: Optional[int] = None,
        offset: int = 0,
        since: Optional[datetime] = None,
        role: Optional[str] = None
    ) -> List[Message]:
        """Get messages for a conversation with filtering and pagination"""
        query = self.db.query(Message).filter(Message.conversation_id == conversation_id)
        
        if since:
            query = query.filter(Message.created_at > since)
        
        if role:
            query = query.filter(Message.role == role)
        
        query = query.order_by(Message.created_at)
        
        if limit:
            query = query.offset(offset).limit(limit)
        
        return query.all()
    
    def get_latest_messages(
        self,
        conversation_id: str,
        count: int = 10
    ) -> List[Message]:
        """Get the latest N messages from a conversation"""
        return self.db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(desc(Message.created_at)).limit(count).all()
    
    def count_conversation_messages(self, conversation_id: str) -> int:
        """Count messages in a conversation"""
        return self.db.query(Message).filter(Message.conversation_id == conversation_id).count()
    
    def update_message(self, message_id: str, **updates) -> Optional[Message]:
        """Update message fields"""
        message = self.get_message_by_id(message_id)
        if not message:
            return None
        
        for field, value in updates.items():
            if hasattr(message, field):
                setattr(message, field, value)
        
        self.db.commit()
        self.db.refresh(message)
        return message
    
    def delete_message(self, message_id: str) -> bool:
        """Delete a message"""
        message = self.get_message_by_id(message_id)
        if not message:
            return False
        
        self.db.delete(message)
        self.db.commit()
        return True
    
    def get_messages_by_intent(
        self,
        intent_name: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Message]:
        """Get messages by intent name for analytics"""
        return self.db.query(Message).filter(
            Message.intent_name == intent_name
        ).order_by(desc(Message.created_at)).offset(offset).limit(limit).all()
    
    def get_messages_by_model(
        self,
        model_used: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Message]:
        """Get messages by model used for analytics"""
        return self.db.query(Message).filter(
            Message.model_used == model_used
        ).order_by(desc(Message.created_at)).offset(offset).limit(limit).all()
    
    def search_message_content(
        self,
        conversation_id: str,
        search_term: str,
        limit: int = 20,
        offset: int = 0
    ) -> List[Message]:
        """Search messages by content within a conversation"""
        return self.db.query(Message).filter(
            and_(
                Message.conversation_id == conversation_id,
                Message.content.ilike(f"%{search_term}%")
            )
        ).order_by(Message.created_at).offset(offset).limit(limit).all()
    
    def get_user_message_count(self, user_id: str) -> int:
        """Get total message count for a user across all conversations"""
        return self.db.query(Message).join(Conversation).filter(
            Conversation.user_id == user_id
        ).count()
    
    def get_assistant_responses_with_buttons(self, limit: int = 50) -> List[Message]:
        """Get assistant messages that include buttons for analytics"""
        return self.db.query(Message).filter(
            and_(
                Message.role == "assistant",
                Message.buttons.isnot(None)
            )
        ).order_by(desc(Message.created_at)).limit(limit).all()
    
    def create_user_message(
        self,
        conversation_id: str,
        content: str,
        message_metadata: Optional[dict] = None
    ) -> Message:
        """Convenience method to create a user message"""
        return self.create_message(
            conversation_id=conversation_id,
            role="user",
            content=content,
            message_metadata=message_metadata
        )
    
    def create_assistant_message(
        self,
        conversation_id: str,
        content: str,
        model_used: str = "rasa",
        intent_name: Optional[str] = None,
        confidence_score: Optional[float] = None,
        response_time_ms: Optional[int] = None,
        buttons: Optional[list] = None,
        custom_data: Optional[dict] = None,
        message_metadata: Optional[dict] = None
    ) -> Message:
        """Convenience method to create an assistant message"""
        return self.create_message(
            conversation_id=conversation_id,
            role="assistant",
            content=content,
            model_used=model_used,
            intent_name=intent_name,
            confidence_score=confidence_score,
            response_time_ms=response_time_ms,
            buttons=buttons,
            custom_data=custom_data,
            message_metadata=message_metadata
        )