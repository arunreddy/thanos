import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime
import uuid
from app.services.chat_service import ChatService


@pytest.fixture
def chat_service():
    with patch("app.services.chat_service.RasaConnector") as mock_connector_class:
        mock_connector = MagicMock()
        mock_connector.send_message = AsyncMock()
        mock_connector.close = AsyncMock()
        mock_connector_class.return_value = mock_connector
        
        service = ChatService()
        service.rasa_connector = mock_connector
        yield service


@pytest.mark.asyncio
async def test_process_message_new_conversation(chat_service):
    # Setup
    test_uuid = "12345678-1234-5678-1234-567812345678"
    with patch("uuid.uuid4", return_value=uuid.UUID(test_uuid)):
        chat_service.rasa_connector.send_message.return_value = [{"text": "Hello from Rasa"}]
        
        # Test
        result = await chat_service.process_message("Hello", "test-user")
        
        # Assertions
        assert result["response"] == "Hello from Rasa"
        assert result["conversation_id"] == test_uuid
        assert len(chat_service.conversations[test_uuid]) == 2  # User message + bot response
        assert chat_service.conversations[test_uuid][0]["role"] == "user"
        assert chat_service.conversations[test_uuid][0]["content"] == "Hello"
        assert chat_service.conversations[test_uuid][1]["role"] == "assistant"
        assert chat_service.conversations[test_uuid][1]["content"] == "Hello from Rasa"


@pytest.mark.asyncio
async def test_process_message_existing_conversation(chat_service):
    # Setup
    conversation_id = "existing-id"
    chat_service.conversations[conversation_id] = []
    chat_service.rasa_connector.send_message.return_value = [{"text": "Another response"}]
    
    # Test
    result = await chat_service.process_message("Hello again", "test-user", conversation_id)
    
    # Assertions
    assert result["response"] == "Another response"
    assert result["conversation_id"] == conversation_id
    assert len(chat_service.conversations[conversation_id]) == 2


@pytest.mark.asyncio
async def test_process_message_with_buttons(chat_service):
    # Setup
    conversation_id = "button-test-id"
    chat_service.rasa_connector.send_message.return_value = [
        {"text": "Choose an option:", "buttons": [
            {"title": "Option 1", "payload": "/option1"},
            {"title": "Option 2", "payload": "/option2"}
        ]}
    ]
    
    # Test
    result = await chat_service.process_message("Show options", "test-user", conversation_id)
    
    # Assertions
    assert result["response"] == "Choose an option:"
    assert len(result["buttons"]) == 2
    assert result["buttons"][0]["title"] == "Option 1"
    assert result["buttons"][1]["title"] == "Option 2"
    
    # Check that buttons are stored in the conversation history
    assert len(chat_service.conversations[conversation_id]) == 2
    assert len(chat_service.conversations[conversation_id][1]["buttons"]) == 2


def test_process_rasa_response_multiple_messages(chat_service):
    # Setup
    rasa_response = [
        {"text": "First part of response"},
        {"text": "Second part of response", "buttons": [{"title": "Click me", "payload": "/click"}]}
    ]
    
    # Test
    result = chat_service._process_rasa_response(rasa_response)
    
    # Assertions
    assert result["text"] == "First part of response Second part of response"
    assert len(result["buttons"]) == 1
    assert result["buttons"][0]["title"] == "Click me"


def test_process_rasa_response_empty(chat_service):
    # Test with empty response
    result = chat_service._process_rasa_response([])
    
    # Should get fallback message
    assert result["text"] == "I'm not sure how to respond to that."
    assert result["buttons"] == []


def test_get_conversation_history(chat_service):
    # Setup
    conversation_id = "test-conversation"
    mock_history = [{"role": "user", "content": "Test message"}]
    chat_service.conversations[conversation_id] = mock_history
    
    # Test
    result = chat_service.get_conversation_history(conversation_id)
    
    # Assertions
    assert result == mock_history


def test_get_conversation_history_not_found(chat_service):
    # Test getting a non-existent conversation
    with pytest.raises(ValueError, match="not found"):
        chat_service.get_conversation_history("non-existent")


@pytest.mark.asyncio
async def test_close(chat_service):
    # Test
    await chat_service.close()
    
    # Assert
    chat_service.rasa_connector.close.assert_awaited_once()