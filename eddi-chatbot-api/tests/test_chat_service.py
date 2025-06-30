import pytest
from app.services.chat_service import ChatService


@pytest.mark.asyncio
async def test_process_message():
    service = ChatService()
    response = await service.process_message("Hello", user_id="test_user")
    assert "response" in response
    assert "conversation_id" in response


def test_get_conversation_history():
    service = ChatService()
    conversation_id = "test_conversation"
    service.conversations[conversation_id] = [{"role": "user", "content": "Hi"}]
    history = service.get_conversation_history(conversation_id)
    assert len(history) == 1
    assert history[0]["content"] == "Hi"


def test_get_conversation_history_not_found():
    service = ChatService()
    with pytest.raises(ValueError):
        service.get_conversation_history("nonexistent")


@pytest.mark.asyncio
async def test_process_message_empty():
    service = ChatService()
    response = await service.process_message("", user_id="test_user")
    assert "response" in response
    assert "conversation_id" in response


@pytest.mark.asyncio
async def test_close():
    service = ChatService()
    await service.close()
