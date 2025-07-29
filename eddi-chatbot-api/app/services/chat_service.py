# app/services/chat_service.py (update)
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.connectors.rasa_connector import RasaConnector
from app.repositories.user_repository import UserRepository
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.message_repository import MessageRepository


class ChatService:
    def __init__(self, db: Session):
        # Database session is required - no fallback
        self.db = db
        
        # Initialize repositories
        self.user_repo = UserRepository(self.db)
        self.conversation_repo = ConversationRepository(self.db)
        self.message_repo = MessageRepository(self.db)
        
        self.rasa_connector = RasaConnector()

    async def process_message(self, message: str, user_id: str = "anonymous", conversation_id: Optional[str] = None, auth_headers: Optional[Dict[str, Any]] = None) -> dict:
        start_time = datetime.now(timezone.utc)
        return await self._process_message_with_db(message, user_id, conversation_id, start_time, auth_headers)
    
    async def _process_message_with_db(self, message: str, user_id: str, conversation_id: Optional[str], start_time: datetime, auth_headers: Optional[Dict[str, Any]] = None) -> dict:
        """Process message using database storage"""
        try:
            # Get or create user (for Okta integration, we'll enhance this later)
            user = self.user_repo.get_user_by_email(user_id)
            if not user:
                user = self.user_repo.create_user(email=user_id, display_name=user_id)
            
            # Update user last active time
            self.user_repo.update_last_active(str(user.id))
            
            # Get or create conversation
            if conversation_id:
                conversation = self.conversation_repo.get_conversation_by_id(conversation_id)
                if not conversation or conversation.user_id != user.id:
                    # Create new conversation if not found or doesn't belong to user
                    conversation = self.conversation_repo.create_conversation(
                        user_id=str(user.id),
                        title=self._generate_conversation_title(message)
                    )
            else:
                conversation = self.conversation_repo.create_conversation(
                    user_id=str(user.id),
                    title=self._generate_conversation_title(message)
                )
            
            # Store user message
            user_message = self.message_repo.create_user_message(
                conversation_id=str(conversation.id),
                content=message
            )
            
            # Send message to Rasa using conversation's Rasa sender ID
            rasa_response = await self.rasa_connector.send_message(message, conversation.rasa_sender_id, auth_headers)
            
            # Calculate response time
            response_time_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
            
            # Process Rasa response
            processed_response = self._process_rasa_response(rasa_response)
            
            # Store assistant response
            assistant_message = self.message_repo.create_assistant_message(
                conversation_id=str(conversation.id),
                content=processed_response.get("text", ""),
                model_used="rasa",
                response_time_ms=response_time_ms,
                buttons=processed_response.get("buttons", []),
                custom_data=processed_response.get("custom", {})
            )
            
            # Update conversation
            self.conversation_repo.increment_message_count(str(conversation.id))
            
            return {
                "response": processed_response.get("text", ""),
                "buttons": processed_response.get("buttons", []),
                "conversation_id": str(conversation.id),
                "custom": processed_response.get("custom", {}),
                "timestamp": assistant_message.created_at.isoformat(),
            }
            
        except Exception as e:
            import traceback
            print(f"Database error in process_message: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            raise e
    
    
    def _generate_conversation_title(self, first_message: str) -> str:
        """Generate a conversation title from the first message"""
        # Take first 50 characters and clean up
        title = first_message[:50].strip()
        if len(first_message) > 50:
            title += "..."
        return title if title else "New Conversation"

    def _process_rasa_response(self, rasa_response: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Process raw Rasa response into structured format."""
        # Collect all texts and buttons
        texts = []
        all_buttons = []
        custom = {}

        for msg in rasa_response:
            if "text" in msg:
                texts.append(msg["text"])

            if "buttons" in msg:
                all_buttons.extend(msg["buttons"])

            if "custom" in msg:
                custom.update(msg["custom"])
                custom_object = msg["custom"]
                if custom_object.get("form_type", "") == "download":
                    file_name = custom_object.get("file_name")
                    content = json.dumps(custom_object.get("objects", {}))
                    os.makedirs("/tmp/downloads", exist_ok=True)
                    download_file_path = f"/tmp/downloads/{file_name}"
                    with open(download_file_path, "w") as f:
                        f.write(content)

                    text = "Download file"
                    texts.append(text)

        # Fallback if Rasa doesn't respond
        if not texts:
            texts = ["I'm not sure how to respond to that."]

        return {"text": " ".join(texts), "buttons": all_buttons, "custom": custom}

    def get_conversation_history(self, conversation_id: str) -> List[dict]:
        """Get conversation history from database"""
        try:
            messages = self.message_repo.get_conversation_messages(conversation_id)
            return [msg.to_dict() for msg in messages]
        except Exception as e:
            print(f"Database error in get_conversation_history: {e}")
            raise ValueError(f"Conversation ID {conversation_id} not found")
    
    def get_user_conversations(self, user_id: str, limit: int = 20, offset: int = 0) -> List[dict]:
        """Get conversations for a user"""
        
        try:
            user = self.user_repo.get_user_by_email(user_id)
            if not user:
                return []
            
            conversations = self.conversation_repo.get_user_conversations(
                user_id=str(user.id),
                status="active",
                limit=limit,
                offset=offset
            )
            return [conv.to_dict() for conv in conversations]
        except Exception as e:
            print(f"Database error in get_user_conversations: {e}")
            return []
    
    def create_conversation_for_user(self, user_id: str, title: str, topic: Optional[str] = None) -> dict:
        """Create a new conversation for a user (database only)"""
        if not self.db or not self.conversation_repo:
            raise ValueError("Database not available for conversation creation")
        
        try:
            user = self.user_repo.get_user_by_email(user_id)
            if not user:
                user = self.user_repo.create_user(email=user_id, display_name=user_id)
            
            conversation = self.conversation_repo.create_conversation(
                user_id=str(user.id),
                title=title,
                topic=topic or "general"
            )
            return conversation.to_dict()
        except Exception as e:
            print(f"Database error in create_conversation_for_user: {e}")
            raise ValueError(f"Failed to create conversation: {e}")
    
    def get_or_create_user_from_okta(self, okta_user_info: dict) -> dict:
        """Get or create user from Okta user information (database only)"""
        if not self.db or not self.user_repo:
            raise ValueError("Database not available for user operations")
        
        try:
            user = self.user_repo.get_or_create_user_from_okta(okta_user_info)
            return user.to_dict()
        except Exception as e:
            print(f"Database error in get_or_create_user_from_okta: {e}")
            raise ValueError(f"Failed to get/create user: {e}")

    async def close(self):
        await self.rasa_connector.close()
