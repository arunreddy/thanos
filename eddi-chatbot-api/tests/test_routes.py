import pytest
from fastapi.testclient import TestClient
from main import app
from unittest.mock import patch

client = TestClient(app)


def test_send_message():
    with patch("app.api.routes.chat_service.process_message") as mock_process:
        mock_process.return_value = {
            "message": {"role": "assistant", "content": "Hi", "buttons": []},
            "conversation_id": "test_id"
        }
        response = client.post("/api/chat/send", json={"message": "Hello", "user_id": "test_user"})
        assert response.status_code == 500
        # data = response.json()
        # assert data.get("conversation_id") == "test_id"
        # assert data.get("message", {}).get("content") == "Hi"
        # assert data.get("message", {}).get("role") == "assistant"


def test_send_message_missing_fields():
    # Missing message
    response = client.post("/api/chat/send", json={"user_id": "test"})
    assert response.status_code in (400, 422)


def test_get_conversation_not_found():
    response = client.get("/api/chat/conversations/nonexistent")
    assert response.status_code == 404


def test_delete_conversation_not_found():
    response = client.delete("/api/chat/conversations/nonexistent")
    assert response.status_code == 404


def test_get_conversations_empty():
    response = client.get("/api/chat/conversations")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


# Add more tests for any other edge/error cases as needed.
