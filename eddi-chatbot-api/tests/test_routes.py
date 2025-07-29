import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_send_message(mock_repositories, mock_rasa_connector):
    response = client.post("/api/chat/send", json={"message": "Hello"})
    assert response.status_code == 200
    data = response.json()
    assert "conversation_id" in data
    assert "message" in data
    assert data["message"]["role"] == "assistant"


def test_send_message_missing_fields():
    # Missing message
    response = client.post("/api/chat/send", json={"user_id": "test"})
    assert response.status_code in (400, 422)


def test_get_conversation_not_found(mock_repositories):
    # Override mock to raise exception for not found conversation
    mock_repositories['message_repo'].get_conversation_messages.side_effect = Exception("Not found")
    response = client.get("/api/chat/conversations/nonexistent")
    assert response.status_code == 404


def test_get_conversations_empty(mock_repositories):
    response = client.get("/api/chat/conversations")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


# Add more tests for any other edge/error cases as needed.
