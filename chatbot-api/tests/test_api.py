# test_api.py (new file in chatbot-api directory)
import asyncio

import httpx


async def test_api():
    async with httpx.AsyncClient(base_url="http://localhost:48000") as client:
        # Send a message
        print("Testing /api/chat/send endpoint...")
        response = await client.post("/api/chat/send", json={"message": "Hello", "user_id": "test_user"})

        print(f"Status code: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")

        conversation_id = data["conversation_id"]

        # Get conversation history
        print("\nTesting /api/chat/conversations/{id} endpoint...")
        response = await client.get(f"/api/chat/conversations/{conversation_id}")
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.json()}")

        # Get all conversations
        print("\nTesting /api/chat/conversations endpoint...")
        response = await client.get("/api/chat/conversations")
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.json()}")


if __name__ == "__main__":
    asyncio.run(test_api())
