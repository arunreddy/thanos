# app/services/chat_service.py (update)
import json
import os
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
        print(f"Sending message to Rasa: {message}")
        rasa_response = await self.rasa_connector.send_message(message, conversation_id)

        # Process Rasa response
        processed_response = self._process_rasa_response(rasa_response)

        # Store message and response in history
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []

        timestamp = datetime.now().isoformat()

        # Add user message to history
        self.conversations[conversation_id].append({"role": "user", "content": message, "timestamp": timestamp, "user_id": user_id})

        # Add assistant response to history
        self.conversations[conversation_id].append(
            {
                "role": "assistant",
                "content": processed_response.get("text", ""),
                "buttons": processed_response.get("buttons", []),  # Store buttons in history
                "custom": processed_response.get("custom", {}),
                "timestamp": timestamp,
            }
        )

        return {
            "response": processed_response.get("text", ""),
            "buttons": processed_response.get("buttons", []),
            "conversation_id": conversation_id,
            "custom": processed_response.get("custom", {}),
            "timestamp": timestamp,
        }

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
        if conversation_id not in self.conversations:
            raise ValueError(f"Conversation ID {conversation_id} not found")

        return self.conversations[conversation_id]

    async def close(self):
        await self.rasa_connector.close()
