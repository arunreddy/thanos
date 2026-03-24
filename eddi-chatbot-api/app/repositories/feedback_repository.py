from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.feedback import MessageFeedback


class FeedbackRepository:
    """Repository for message feedback CRUD operations"""

    def __init__(self, db: Session):
        self.db = db

    def create_or_update_feedback(
        self,
        message_id: str,
        user_id: str,
        feedback_type: str,
        category: Optional[str] = None,
        comment: Optional[str] = None,
    ) -> MessageFeedback:
        """Create or update feedback for a message (upsert on message_id + user_id)."""
        existing = self.get_user_feedback_for_message(message_id, user_id)
        if existing:
            existing.feedback_type = feedback_type
            existing.category = category
            existing.comment = comment
            self.db.commit()
            self.db.refresh(existing)
            return existing

        feedback = MessageFeedback(
            message_id=message_id,
            user_id=user_id,
            feedback_type=feedback_type,
            category=category,
            comment=comment,
        )
        self.db.add(feedback)
        self.db.commit()
        self.db.refresh(feedback)
        return feedback

    def get_user_feedback_for_message(
        self, message_id: str, user_id: str
    ) -> Optional[MessageFeedback]:
        """Get a specific user's feedback for a message."""
        return (
            self.db.query(MessageFeedback)
            .filter(
                MessageFeedback.message_id == message_id,
                MessageFeedback.user_id == user_id,
            )
            .first()
        )

    def get_feedback_for_message(self, message_id: str) -> List[MessageFeedback]:
        """Get all feedback for a message."""
        return (
            self.db.query(MessageFeedback)
            .filter(MessageFeedback.message_id == message_id)
            .all()
        )

    def delete_feedback(self, message_id: str, user_id: str) -> bool:
        """Delete feedback for a message. Returns True if deleted."""
        feedback = self.get_user_feedback_for_message(message_id, user_id)
        if feedback:
            self.db.delete(feedback)
            self.db.commit()
            return True
        return False
