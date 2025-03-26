import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.connectors.rasa_connector import RasaConnector


class ChatService:
    def __init__(self):
        # In-memory storage for chat history
        # In a production environment, you'd use a database
        self.conversations: Dict[str, List[dict]] = {}
        self.rasa_connector = RasaConnector()

    async def process_message(self, message: str, user_id: str = "anonymous", conversation_id: Optional[str] = None) -> dict:
        # Use existing conversation ID or generate a new one
        if conversation_id is None:
            conversation_id = str(uuid.uuid4())

        # Send message to Rasa
        rasa_response = await self.rasa_connector.send_message(message, user_id)

        # Extract text from Rasa response
        bot_responses = []
        for msg in rasa_response:
            if "text" in msg:
                bot_responses.append(msg["text"])

        # Fallback if Rasa doesn't respond
        if not bot_responses:
            bot_responses = ["I'm not sure how to respond to that."]

        # Join multiple responses
        bot_response_text = " ".join(bot_responses)

        # Store message and response in history
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []

        timestamp = datetime.now().isoformat()

        self.conversations[conversation_id].extend(
            [{"role": "user", "content": message, "timestamp": timestamp, "user_id": user_id}, {"role": "assistant", "content": bot_response_text, "timestamp": timestamp}]
        )

        return {"response": bot_response_text, "conversation_id": conversation_id}

    def get_conversation_history(self, conversation_id: str) -> List[dict]:
        if conversation_id not in self.conversations:
            raise ValueError(f"Conversation ID {conversation_id} not found")

        return self.conversations[conversation_id]

    async def close(self):
        await self.rasa_connector.close()
