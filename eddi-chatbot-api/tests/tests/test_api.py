import os
import pytest
from fastapi.testclient import TestClient
from main import app
from unittest.mock import patch

client = TestClient(app)


def test_get_all_conversations(mock_repositories):
    response = client.get("/api/chat/conversations")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_conversation_success(mock_repositories):
    response = client.get("/api/chat/conversations/test_conversation_id")
    assert response.status_code == 200
    assert response.json()["conversation_id"] == "test_conversation_id"

def test_delete_conversation(mock_repositories):
    response = client.delete("/api/chat/conversations/test_conversation_id")
    assert response.status_code in (200, 204)

def test_delete_conversation_not_found(mock_repositories):
    # Override the mock to return False for this test
    mock_repositories['conversation_repo'].delete_conversation.return_value = False
    response = client.delete("/api/chat/conversations/nonexistent")
    assert response.status_code == 404

def test_get_conversation_not_found(mock_repositories):
    # Override the mock to raise an exception (empty messages = not found)
    mock_repositories['message_repo'].get_conversation_messages.side_effect = Exception("Not found")
    response = client.get("/api/chat/conversations/nonexistent")
    assert response.status_code == 404

def test_send_message_invalid_payload():
    # Test validation errors without database dependencies
    # Missing 'message' field
    response = client.post("/api/chat/send", json={"user_id": "test_user"})
    assert response.status_code in (400, 422)
    
    # Empty payload
    response = client.post("/api/chat/send", json={})
    assert response.status_code in (400, 422)


def test_send_message_valid_payload(mock_repositories, mock_rasa_connector):
    # Test valid request using fixtures
    response = client.post("/api/chat/send", json={"message": "Hello"})
    assert response.status_code == 200
    assert "conversation_id" in response.json()
    assert "message" in response.json()

def test_download_file_success():
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
