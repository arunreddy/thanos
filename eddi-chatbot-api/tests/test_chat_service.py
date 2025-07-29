import pytest
from app.services.chat_service import ChatService


@pytest.mark.asyncio
async def test_process_message(mock_db_session, mock_repositories, mock_rasa_connector):
    service = ChatService(db=mock_db_session)
    response = await service.process_message("Hello", user_id="test_user")
    assert "response" in response
    assert "conversation_id" in response


def test_get_conversation_history(mock_db_session, mock_repositories):
    service = ChatService(db=mock_db_session)
    history = service.get_conversation_history("test_conversation_id")
    assert len(history) == 1
    assert history[0]["content"] == "Test message"


def test_get_conversation_history_not_found(mock_db_session, mock_repositories):
    service = ChatService(db=mock_db_session)
    # Override mock to raise exception (simulating database error)
    mock_repositories['message_repo'].get_conversation_messages.side_effect = Exception("Not found")
    with pytest.raises(ValueError):
        service.get_conversation_history("nonexistent")


@pytest.mark.asyncio
async def test_process_message_empty(mock_db_session, mock_repositories, mock_rasa_connector):
    service = ChatService(db=mock_db_session)
    response = await service.process_message("", user_id="test_user")
    assert "response" in response
    assert "conversation_id" in response


@pytest.mark.asyncio
async def test_close(mock_db_session):
    service = ChatService(db=mock_db_session)
    await service.close()
