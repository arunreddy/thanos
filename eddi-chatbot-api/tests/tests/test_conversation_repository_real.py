import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.repositories.conversation_repository import ConversationRepository
from app.models.conversation import Conversation


@pytest.fixture
def mock_session():
    session = MagicMock(spec=Session)
    session.refresh = MagicMock()
    return session


@pytest.fixture
def conversation_repo(mock_session):
    return ConversationRepository(mock_session)


@pytest.fixture
def mock_conversation():
    conversation = MagicMock(spec=Conversation)
    conversation.id = "test_conv_id"
    conversation.user_id = "test_user_id"
    conversation.title = "Test Conversation"
    conversation.status = "active"
    conversation.message_count = 5
    conversation.created_at = datetime.now(timezone.utc)
    conversation.updated_at = datetime.now(timezone.utc)
    conversation.last_message_at = datetime.now(timezone.utc)
    return conversation


class TestConversationRepository:

    def test_init(self, mock_session):
        repo = ConversationRepository(mock_session)
        assert repo.db == mock_session

    def test_create_conversation_success(self, conversation_repo, mock_session):
        with patch('app.repositories.conversation_repository.Conversation') as mock_class:
            mock_instance = MagicMock()
            mock_instance.id = "new_conv_id"
            mock_class.return_value = mock_instance

            result = conversation_repo.create_conversation(
                user_id="user_123",
                title="New Conversation",
                description="Test description",
                topic="test_topic"
            )

            assert result == mock_instance
            mock_session.add.assert_called_once_with(mock_instance)
            mock_session.commit.assert_called_once()
            mock_session.refresh.assert_called_once_with(mock_instance)  # ✅ FIX

    def test_create_conversation_minimal(self, conversation_repo):
        with patch('app.repositories.conversation_repository.Conversation') as mock_class:
            mock_instance = MagicMock()
            mock_class.return_value = mock_instance

            result = conversation_repo.create_conversation(
                user_id="user_123",
                title="Minimal Conversation"
            )

            assert result == mock_instance

    def test_create_conversation_integrity_error(self, conversation_repo, mock_session):
        mock_session.commit.side_effect = IntegrityError("duplicate key", {}, None)

        with patch('app.repositories.conversation_repository.Conversation'):
            with pytest.raises(ValueError, match="Failed to create conversation"):
                conversation_repo.create_conversation(user_id="user_123", title="Test")

            mock_session.rollback.assert_called_once()

    def test_get_conversation_by_id_success(self, conversation_repo, mock_session, mock_conversation):
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation

        result = conversation_repo.get_conversation_by_id("test_conv_id")

        assert result == mock_conversation
        mock_session.query.assert_called_once_with(Conversation)

    def test_get_conversation_by_id_not_found(self, conversation_repo, mock_session):
        mock_session.query.return_value.filter.return_value.first.return_value = None

        result = conversation_repo.get_conversation_by_id("nonexistent")

        assert result is None

    def test_get_user_conversations_basic(self, conversation_repo, mock_session):
        mock_conversations = [MagicMock(), MagicMock()]
        mock_session.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = mock_conversations

        result = conversation_repo.get_user_conversations("user_123")

        assert result == mock_conversations

    def test_count_user_conversations(self, conversation_repo, mock_session):
        mock_session.query.return_value.filter.return_value.count.return_value = 15

        result = conversation_repo.count_user_conversations("user_123")

        assert result == 15

    def test_update_conversation_success(self, conversation_repo, mock_session, mock_conversation):
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation

        result = conversation_repo.update_conversation(
            "test_conv_id",
            title="Updated Title",
            description="Updated description"
        )

        assert result == mock_conversation
        assert mock_conversation.title == "Updated Title"
        assert mock_conversation.description == "Updated description"
        mock_session.commit.assert_called_once()
        mock_session.refresh.assert_called_once_with(mock_conversation)

    def test_update_conversation_not_found(self, conversation_repo, mock_session):
        mock_session.query.return_value.filter.return_value.first.return_value = None

        result = conversation_repo.update_conversation("nonexistent", title="Updated")

        assert result is None

    def test_increment_message_count_success(self, conversation_repo, mock_session, mock_conversation):
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation
        mock_conversation.message_count = 5

        result = conversation_repo.increment_message_count("test_conv_id")

        assert result == mock_conversation
        assert mock_conversation.message_count == 6
        mock_session.commit.assert_called_once()
        mock_session.refresh.assert_called_once_with(mock_conversation)

    def test_increment_message_count_not_found(self, conversation_repo, mock_session):
        mock_session.query.return_value.filter.return_value.first.return_value = None

        result = conversation_repo.increment_message_count("nonexistent")

        assert result is None

    def test_archive_conversation_success(self, conversation_repo, mock_session, mock_conversation):
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation

        result = conversation_repo.archive_conversation("test_conv_id")

        assert result == mock_conversation
        assert mock_conversation.status == "archived"

    def test_delete_conversation_success(self, conversation_repo, mock_session, mock_conversation):
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation

        result = conversation_repo.delete_conversation("test_conv_id")

        assert result is True
        assert mock_conversation.status == "deleted"

    def test_hard_delete_conversation_success(self, conversation_repo, mock_session, mock_conversation):
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation

        result = conversation_repo.hard_delete_conversation("test_conv_id")

        assert result is True
        mock_session.delete.assert_called_once_with(mock_conversation)
        mock_session.commit.assert_called_once()

    def test_get_or_create_conversation_existing(self, conversation_repo, mock_session, mock_conversation):
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation
        mock_conversation.user_id = "user_123"

        result = conversation_repo.get_or_create_conversation(
            user_id="user_123",
            conversation_id="test_conv_id"
        )

        assert result == mock_conversation

    def test_get_or_create_conversation_new(self, conversation_repo, mock_session):
        mock_session.query.return_value.filter.return_value.first.return_value = None

        with patch('app.repositories.conversation_repository.Conversation') as mock_class:
            mock_instance = MagicMock()
            mock_class.return_value = mock_instance

            result = conversation_repo.get_or_create_conversation(
                user_id="user_123",
                title="Custom Title",
                topic="custom_topic"
            )

            assert result == mock_instance