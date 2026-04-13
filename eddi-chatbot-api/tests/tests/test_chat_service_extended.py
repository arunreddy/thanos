import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.services.chat_service import ChatService


class TestChatServiceExtended:
    """Updated tests for ChatService (LLM-based, no Rasa)"""

    def test_generate_conversation_title_short(self, mock_db_session):
        service = ChatService(db=mock_db_session)
        title = service._generate_conversation_title("Hello")
        assert title == "Hello"

    def test_generate_conversation_title_long(self, mock_db_session):
        service = ChatService(db=mock_db_session)
        long_message = "x" * 60
        title = service._generate_conversation_title(long_message)
        assert len(title) <= 53  # 50 chars + "..."
        assert title.endswith("...")

    def test_generate_conversation_title_empty(self, mock_db_session):
        service = ChatService(db=mock_db_session)
        title = service._generate_conversation_title("")
        assert title == "New Conversation"

    def test_generate_conversation_title_whitespace(self, mock_db_session):
        service = ChatService(db=mock_db_session)
        title = service._generate_conversation_title("   ")
        assert title == "New Conversation"

    @pytest.mark.asyncio
    async def test_process_message_basic(self, mock_db_session, mock_repositories):
        service = ChatService(db=mock_db_session)

        # Mock LLM response
        service.llm.send_message = AsyncMock(return_value={
            "text": "Hello!",
            "buttons": [{"title": "Click", "payload": "/click"}],
            "custom": {"intent": "greet"}
        })

        result = await service.process_message(
            message="Hi",
            user_id="user_123"
        )

        assert result["response"] == "Hello!"
        assert result["buttons"][0]["title"] == "Click"
        assert result["custom"]["intent"] == "greet"
        assert "conversation_id" in result
        assert "timestamp" in result
        assert "message_id" in result

    @pytest.mark.asyncio
    async def test_process_message_empty_llm_response(self, mock_db_session, mock_repositories):
        service = ChatService(db=mock_db_session)

        service.llm.send_message = AsyncMock(return_value={})

        result = await service.process_message(
            message="Hi",
            user_id="user_123"
        )

        assert result["response"] == ""
        assert result["buttons"] == []
        assert result["custom"] == {}

    @pytest.mark.asyncio
    async def test_close(self, mock_db_session):
        service = ChatService(db=mock_db_session)

        with patch.object(service.llm, 'close') as mock_close:
            await service.close()
            mock_close.assert_called_once()

    def test_get_user_conversations_with_database(self, mock_db_session, mock_repositories):
        service = ChatService(db=mock_db_session)

        service.get_user_conversations("user_123")

        mock_repositories['user_repo'].get_user_by_email.assert_called_with("user_123")

    def test_get_user_conversations_no_user(self, mock_db_session, mock_repositories):
        service = ChatService(db=mock_db_session)
        mock_repositories['user_repo'].get_user_by_email.return_value = None

        result = service.get_user_conversations("nonexistent_user")

        assert result == []

    def test_create_conversation_for_user(self, mock_db_session, mock_repositories):
        service = ChatService(db=mock_db_session)

        result = service.create_conversation_for_user("user_123", "Test Title")

        assert result is not None

    def test_service_initialization_repositories(self, mock_db_session):
        service = ChatService(db=mock_db_session)

        assert service.db == mock_db_session
        assert service.user_repo is not None
        assert service.conversation_repo is not None
        assert service.message_repo is not None
        assert service.feedback_repo is not None
        assert service.llm is not None