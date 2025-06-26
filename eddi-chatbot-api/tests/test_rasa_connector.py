import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from app.connectors.rasa_connector import RasaConnector
import httpx


@pytest.fixture
def mock_httpx_client():
    with patch("httpx.AsyncClient", autospec=True) as mock_client:
        client_instance = MagicMock()
        client_instance.post = AsyncMock()
        client_instance.aclose = AsyncMock()
        mock_client.return_value = client_instance
        yield client_instance


@pytest.mark.asyncio
async def test_send_message_success(mock_httpx_client):
    # Setup
    rasa_response = [{"text": "Hello, how can I help?"}]
    mock_response = MagicMock()
    mock_response.json.return_value = rasa_response
    mock_httpx_client.post.return_value = mock_response
    
    # Test
    connector = RasaConnector()
    result = await connector.send_message("Hello", "user123")
    
    # Assertions
    mock_httpx_client.post.assert_awaited_once_with(
        "http://localhost:45005/webhooks/rest/webhook",
        json={"sender": "user123", "message": "Hello"}
    )
    assert result == rasa_response


@pytest.mark.asyncio
async def test_send_message_http_error(mock_httpx_client):
    # Setup to simulate an HTTP error
    mock_httpx_client.post.side_effect = httpx.HTTPError("Connection error")
    
    # Test
    connector = RasaConnector()
    result = await connector.send_message("Hello", "user123")
    
    # Assertions - should return fallback response
    assert result == [{"text": "Sorry, I'm having trouble processing your request."}]


@pytest.mark.asyncio
async def test_close():
    # Setup
    with patch("httpx.AsyncClient", autospec=True) as mock_client:
        client_instance = MagicMock()
        client_instance.aclose = AsyncMock()
        mock_client.return_value = client_instance
        
        # Test
        connector = RasaConnector()
        await connector.close()
        
        # Assert client was closed
        client_instance.aclose.assert_awaited_once()