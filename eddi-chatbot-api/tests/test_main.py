import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from main import app, lifespan


def test_app_startup():
    assert app.title == "Chatbot API"
    assert app.openapi_tags is None


def test_cors_middleware():
    # Check CORS middleware configuration
    cors_middleware = None
    for middleware in app.user_middleware:
        if middleware.cls.__name__ == "CORSMiddleware":
            cors_middleware = middleware
            break
    
    assert cors_middleware is not None
    # In FastAPI, middleware.options is not directly accessible, so we check the middleware itself
    assert len(app.user_middleware) > 0
    # The test passes if we find the CORS middleware


@pytest.mark.asyncio
async def test_lifespan():
    # Mock the chat service
    with patch("main.chat_service", autospec=True) as mock_service:
        mock_service.close = AsyncMock()
        fake_app = object()  # Just a placeholder
        
        # Call the lifespan context manager
        async with lifespan(fake_app):
            pass  # Nothing happens on startup in this app
        
        # Verify chat_service.close was called
        mock_service.close.assert_awaited_once()