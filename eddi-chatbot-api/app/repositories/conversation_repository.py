from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc, and_
from app.models.conversation import Conversation
from app.models.user import User


class ConversationRepository:
    """Repository for conversation CRUD operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_conversation(
        self,
        user_id: str,
        title: str,
        description: Optional[str] = None,
        topic: Optional[str] = None,
        conversation_metadata: Optional[dict] = None
    ) -> Conversation:
        """Create a new conversation"""
        conversation = Conversation(
            user_id=user_id,
            title=title,
            description=description,
            topic=topic,
            conversation_metadata=conversation_metadata or {}
        )
        
        try:
            self.db.add(conversation)
            self.db.commit()
            self.db.refresh(conversation)
            
            # Generate Rasa sender ID after conversation has been saved and has an ID
            conversation.generate_rasa_sender_id()
            self.db.commit()
            self.db.refresh(conversation)
            
            return conversation
        except IntegrityError:
            self.db.rollback()
            raise ValueError("Failed to create conversation")
    
    def get_conversation_by_id(self, conversation_id: str) -> Optional[Conversation]:
        """Get conversation by ID"""
        return self.db.query(Conversation).filter(Conversation.id == conversation_id).first()
    
    def get_conversation_by_rasa_sender_id(self, rasa_sender_id: str) -> Optional[Conversation]:
        """Get conversation by Rasa sender ID"""
        return self.db.query(Conversation).filter(Conversation.rasa_sender_id == rasa_sender_id).first()
    
    def get_user_conversations(
        self, 
        user_id: str, 
        status: Optional[str] = None,
        topic: Optional[str] = None,
        limit: int = 20, 
        offset: int = 0
    ) -> List[Conversation]:
        """Get conversations for a user with filtering and pagination"""
        query = self.db.query(Conversation).filter(Conversation.user_id == user_id)
        
        if status:
            query = query.filter(Conversation.status == status)
        
        if topic:
            query = query.filter(Conversation.topic == topic)
        
        return query.order_by(desc(Conversation.last_message_at)).offset(offset).limit(limit).all()
    
    def count_user_conversations(self, user_id: str, status: Optional[str] = None) -> int:
        """Count conversations for a user"""
        query = self.db.query(Conversation).filter(Conversation.user_id == user_id)
        
        if status:
            query = query.filter(Conversation.status == status)
        
        return query.count()
    
    def update_conversation(self, conversation_id: str, **updates) -> Optional[Conversation]:
        """Update conversation fields"""
        conversation = self.get_conversation_by_id(conversation_id)
        if not conversation:
            return None
        
        for field, value in updates.items():
            if hasattr(conversation, field):
                setattr(conversation, field, value)
        
        conversation.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(conversation)
        return conversation
    
    def update_last_message_time(self, conversation_id: str) -> Optional[Conversation]:
        """Update conversation's last message timestamp"""
        return self.update_conversation(conversation_id, last_message_at=datetime.utcnow())
    
    def increment_message_count(self, conversation_id: str) -> Optional[Conversation]:
        """Increment the message count for a conversation"""
        conversation = self.get_conversation_by_id(conversation_id)
        if not conversation:
            return None
        
        conversation.message_count += 1
        conversation.last_message_at = datetime.utcnow()
        conversation.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(conversation)
        return conversation
    
    def archive_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Archive a conversation"""
        return self.update_conversation(conversation_id, status="archived")
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """Soft delete a conversation"""
        conversation = self.update_conversation(conversation_id, status="deleted")
        return conversation is not None
    
    def hard_delete_conversation(self, conversation_id: str) -> bool:
        """Permanently delete a conversation and all messages"""
        conversation = self.get_conversation_by_id(conversation_id)
        if not conversation:
            return False
        
        self.db.delete(conversation)
        self.db.commit()
        return True
    
    def get_or_create_conversation(
        self,
        user_id: str,
        conversation_id: Optional[str] = None,
        title: Optional[str] = None,
        topic: Optional[str] = None
    ) -> Conversation:
        """Get existing conversation or create a new one"""
        if conversation_id:
            conversation = self.get_conversation_by_id(conversation_id)
            if conversation and conversation.user_id == user_id:
                return conversation
        
        # Create new conversation
        if not title:
            title = "New Conversation"
        
        return self.create_conversation(
            user_id=user_id,
            title=title,
            topic=topic or "general"
        )
    
    def search_conversations(
        self,
        user_id: str,
        search_term: str,
        limit: int = 20,
        offset: int = 0
    ) -> List[Conversation]:
        """Search conversations by title or description"""
        return self.db.query(Conversation).filter(
            and_(
                Conversation.user_id == user_id,
                Conversation.status == "active",
                Conversation.title.ilike(f"%{search_term}%")
            )
        ).order_by(desc(Conversation.last_message_at)).offset(offset).limit(limit).all()
    
    def get_recent_conversations(self, limit: int = 10) -> List[Conversation]:
        """Get recently active conversations across all users"""
        return self.db.query(Conversation).filter(
            Conversation.status == "active"
        ).order_by(desc(Conversation.last_message_at)).limit(limit).all()
    
    def get_conversations_by_topic(self, topic: str, limit: int = 20, offset: int = 0) -> List[Conversation]:
        """Get conversations by topic across all users"""
        return self.db.query(Conversation).filter(
            and_(
                Conversation.topic == topic,
                Conversation.status == "active"
            )
        ).order_by(desc(Conversation.last_message_at)).offset(offset).limit(limit).all()