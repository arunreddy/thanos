import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.connectors.llm_connector import LLMConnector
from app.repositories.user_repository import UserRepository
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.feedback_repository import FeedbackRepository


class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(self.db)
        self.conversation_repo = ConversationRepository(self.db)
        self.message_repo = MessageRepository(self.db)
        self.feedback_repo = FeedbackRepository(self.db)
        self.llm = LLMConnector()

    async def process_message(
        self,
        message: str,
        user_id: str = "anonymous",
        conversation_id: Optional[str] = None,
        auth_headers: Optional[Dict[str, Any]] = None,
    ) -> dict:
        start_time = datetime.now(timezone.utc)

        try:
            # Get or create user
            user = self.user_repo.get_user_by_email(user_id)
            if not user:
                user = self.user_repo.create_user(email=user_id, display_name=user_id)

            self.user_repo.update_last_active(str(user.id))

            # Get or create conversation
            if conversation_id:
                conversation = self.conversation_repo.get_conversation_by_id(conversation_id)
                if not conversation or conversation.user_id != user.id:
                    conversation = self.conversation_repo.create_conversation(
                        user_id=str(user.id),
                        title=self._generate_conversation_title(message),
                    )
            else:
                conversation = self.conversation_repo.create_conversation(
                    user_id=str(user.id),
                    title=self._generate_conversation_title(message),
                )

            # Store user message
            self.message_repo.create_user_message(
                conversation_id=str(conversation.id),
                content=message,
            )

            # Send to LLM
            llm_response = await self.llm.send_message(
                message=message,
                conversation_id=str(conversation.id),
                auth_headers=auth_headers,
            )

            response_time_ms = int(
                (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
            )

            # Store assistant response
            assistant_message = self.message_repo.create_assistant_message(
                conversation_id=str(conversation.id),
                content=llm_response.get("text", ""),
                model_used="mock-llm",
                response_time_ms=response_time_ms,
                buttons=llm_response.get("buttons", []),
                custom_data=llm_response.get("custom", {}),
            )

            self.conversation_repo.increment_message_count(str(conversation.id))

            return {
                "response": llm_response.get("text", ""),
                "buttons": llm_response.get("buttons", []),
                "conversation_id": str(conversation.id),
                "custom": llm_response.get("custom", {}),
                "timestamp": assistant_message.created_at.isoformat(),
                "message_id": str(assistant_message.id),
            }

        except Exception as e:
            import traceback
            print(f"Error in process_message: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            raise

    def _generate_conversation_title(self, first_message: str) -> str:
        title = first_message[:50].strip()
        if len(first_message) > 50:
            title += "..."
        return title if title else "New Conversation"

    def get_conversation_history(self, conversation_id: str) -> List[dict]:
        try:
            messages = self.message_repo.get_conversation_messages(conversation_id)
            return [msg.to_dict() for msg in messages]
        except Exception as e:
            print(f"Database error in get_conversation_history: {e}")
            raise ValueError(f"Conversation ID {conversation_id} not found")

    def get_user_conversations(self, user_id: str, limit: int = 20, offset: int = 0) -> List[dict]:
        try:
            user = self.user_repo.get_user_by_email(user_id)
            if not user:
                return []

            conversations = self.conversation_repo.get_user_conversations(
                user_id=str(user.id),
                status="active",
                limit=limit,
                offset=offset,
            )
            return [conv.to_dict() for conv in conversations]
        except Exception as e:
            print(f"Database error in get_user_conversations: {e}")
            return []

    def create_conversation_for_user(self, user_id: str, title: str, topic: Optional[str] = None) -> dict:
        try:
            user = self.user_repo.get_user_by_email(user_id)
            if not user:
                user = self.user_repo.create_user(email=user_id, display_name=user_id)

            conversation = self.conversation_repo.create_conversation(
                user_id=str(user.id),
                title=title,
                topic=topic or "general",
            )
            return conversation.to_dict()
        except Exception as e:
            print(f"Database error in create_conversation_for_user: {e}")
            raise ValueError(f"Failed to create conversation: {e}")

    def get_or_create_user_from_okta(self, okta_user_info: dict) -> dict:
        try:
            user = self.user_repo.get_or_create_user_from_okta(okta_user_info)
            return user.to_dict()
        except Exception as e:
            print(f"Database error in get_or_create_user_from_okta: {e}")
            raise ValueError(f"Failed to get/create user: {e}")

    def submit_feedback(
        self,
        message_id: str,
        user_id: str,
        feedback_type: str,
        category: Optional[str] = None,
        comment: Optional[str] = None,
    ) -> dict:
        # Verify message exists
        message = self.message_repo.get_message_by_id(message_id)
        if not message:
            raise ValueError(f"Message {message_id} not found")

        # Get or create user
        user = self.user_repo.get_user_by_email(user_id)
        if not user:
            user = self.user_repo.create_user(email=user_id, display_name=user_id)

        feedback = self.feedback_repo.create_or_update_feedback(
            message_id=message_id,
            user_id=str(user.id),
            feedback_type=feedback_type,
            category=category,
            comment=comment,
        )
        return feedback.to_dict()

    def delete_feedback(self, message_id: str, user_id: str) -> bool:
        user = self.user_repo.get_user_by_email(user_id)
        if not user:
            return False
        return self.feedback_repo.delete_feedback(message_id, str(user.id))

    async def close(self):
        await self.llm.close()
