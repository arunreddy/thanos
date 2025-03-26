from typing import Any, Dict, Optional

import httpx


class RasaConnector:
    def __init__(self, rasa_url: str = "http://localhost:45005"):  # Changed port to 45005
        self.rasa_url = rasa_url
        self.client = httpx.AsyncClient(timeout=30.0)

    async def send_message(self, message: str, sender_id: str) -> Dict[str, Any]:
        """Send a message to Rasa and get the response."""
        endpoint = f"{self.rasa_url}/webhooks/rest/webhook"
        payload = {"sender": sender_id, "message": message}

        try:
            print(f"Sending message to Rasa: {endpoint} {payload}")
            response = await self.client.post(endpoint, json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            print(f"Error communicating with Rasa: {e}")
            return [{"text": "Sorry, I'm having trouble processing your request."}]

    async def close(self):
        await self.client.aclose()
