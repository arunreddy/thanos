# test_api.py (new file in chatbot-api directory)
import os

import httpx
import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


# @pytest.mark.asyncio
# async def test_api():
#     async with httpx.AsyncClient(base_url="http://localhost:48000") as client:
#         # Send a message
#         print("Testing /api/chat/send endpoint...")
#         response = await client.post("/api/chat/send", json={"message": "Hello", "user_id": "test_user"})

#         print(f"Status code: {response.status_code}")
#         data = response.json()
#         print(f"Response: {data}")

#         conversation_id = data["conversation_id"]

#         # Get conversation history
#         print("\nTesting /api/chat/conversations/{id} endpoint...")
#         response = await client.get(f"/api/chat/conversations/{conversation_id}")
#         print(f"Status code: {response.status_code}")
#         print(f"Response: {response.json()}")

#         # Get all conversations
#         print("\nTesting /api/chat/conversations endpoint...")
#         response = await client.get("/api/chat/conversations")
#         print(f"Status code: {response.status_code}")
#         print(f"Response: {response.json()}")


def test_delete_conversation():
    # Create a conversation first
    response = client.post("/api/chat/send", json={"message": "Hi", "user_id": "test_user"})
    assert response.status_code == 200
    conversation_id = response.json()["conversation_id"]
    response = client.delete(f"/api/chat/conversations/{conversation_id}")
    assert response.status_code == 200


def test_get_conversation_not_found():
    response = client.get("/api/chat/conversations/nonexistent")
    assert response.status_code == 404


def test_send_message_invalid_payload():
    response = client.post("/api/chat/send", json={"user_id": "test_user"})
    assert response.status_code in (400, 422)


def test_download_file_success():
    # Create a temporary file in the expected directory
    tmp_dir = "/tmp/downloads"
    os.makedirs(tmp_dir, exist_ok=True)
    file_name = "testfile.txt"
    file_path = os.path.join(tmp_dir, file_name)
    content = b"Hello, world!"
    with open(file_path, "wb") as f:
        f.write(content)

    response = client.get(f"/download/{file_name}")
    assert response.status_code == 200
    assert response.content == content
    assert response.headers["content-type"].startswith("text/plain")
    assert response.headers["content-disposition"].startswith(f'attachment; filename="{file_name}"')

    os.remove(file_path)


def test_download_file_not_found():
    response = client.get("/download/nonexistentfile.txt")
    assert response.status_code == 404
    assert response.json()["detail"] == "File not found"
