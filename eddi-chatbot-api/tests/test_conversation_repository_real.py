import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.repositories.conversation_repository import ConversationRepository
from app.models.conversation import Conversation


@pytest.fixture
def mock_session():
    """Mock database session"""
    return MagicMock(spec=Session)


@pytest.fixture
def conversation_repo(mock_session):
    """Conversation repository fixture"""
    return ConversationRepository(mock_session)


@pytest.fixture
def mock_conversation():
    """Mock conversation object"""
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
    """Test ConversationRepository with actual methods"""

    def test_init(self, mock_session):
        """Test repository initialization"""
        repo = ConversationRepository(mock_session)
        assert repo.db == mock_session

    def test_create_conversation_success(self, conversation_repo, mock_session):
        """Test successful conversation creation"""
        with patch('app.repositories.conversation_repository.Conversation') as mock_conversation_class:
            mock_conversation_instance = MagicMock()
            mock_conversation_instance.id = "new_conv_id"
            mock_conversation_instance.generate_rasa_sender_id = MagicMock()
            mock_conversation_class.return_value = mock_conversation_instance
            
            result = conversation_repo.create_conversation(
                user_id="user_123",
                title="New Conversation",
                description="Test description",
                topic="test_topic"
            )
            
            assert result == mock_conversation_instance
            mock_session.add.assert_called_once_with(mock_conversation_instance)
            assert mock_session.commit.call_count == 2  # Called twice
            mock_conversation_instance.generate_rasa_sender_id.assert_called_once()

    def test_create_conversation_minimal(self, conversation_repo, mock_session):
        """Test conversation creation with minimal data"""
        with patch('app.repositories.conversation_repository.Conversation') as mock_conversation_class:
            mock_conversation_instance = MagicMock()
            mock_conversation_instance.generate_rasa_sender_id = MagicMock()
            mock_conversation_class.return_value = mock_conversation_instance
            
            result = conversation_repo.create_conversation(
                user_id="user_123",
                title="Minimal Conversation"
            )
            
            assert result == mock_conversation_instance

    def test_create_conversation_integrity_error(self, conversation_repo, mock_session):
        """Test conversation creation with integrity error"""
        mock_session.commit.side_effect = IntegrityError("duplicate key", {}, None)
        
        with patch('app.repositories.conversation_repository.Conversation'):
            with pytest.raises(ValueError, match="Failed to create conversation"):
                conversation_repo.create_conversation(user_id="user_123", title="Test")
                
            mock_session.rollback.assert_called_once()

    def test_get_conversation_by_id_success(self, conversation_repo, mock_session, mock_conversation):
        """Test successful conversation retrieval by ID"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation
        
        result = conversation_repo.get_conversation_by_id("test_conv_id")
        
        assert result == mock_conversation
        mock_session.query.assert_called_once_with(Conversation)

    def test_get_conversation_by_id_not_found(self, conversation_repo, mock_session):
        """Test conversation not found by ID"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = conversation_repo.get_conversation_by_id("nonexistent")
        
        assert result is None

    def test_get_conversation_by_rasa_sender_id_success(self, conversation_repo, mock_session, mock_conversation):
        """Test successful conversation retrieval by Rasa sender ID"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation
        
        result = conversation_repo.get_conversation_by_rasa_sender_id("rasa_sender_123")
        
        assert result == mock_conversation

    def test_get_conversation_by_rasa_sender_id_not_found(self, conversation_repo, mock_session):
        """Test conversation not found by Rasa sender ID"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = conversation_repo.get_conversation_by_rasa_sender_id("nonexistent")
        
        assert result is None

    def test_get_user_conversations_basic(self, conversation_repo, mock_session):
        """Test get user conversations with basic parameters"""
        mock_conversations = [MagicMock(), MagicMock()]
        mock_session.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = mock_conversations
        
        result = conversation_repo.get_user_conversations("user_123")
        
        assert result == mock_conversations

    def test_get_user_conversations_with_filters(self, conversation_repo, mock_session):
        """Test get user conversations with status and topic filters"""
        mock_conversations = [MagicMock()]
        mock_query = mock_session.query.return_value
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value.offset.return_value.limit.return_value.all.return_value = mock_conversations
        
        result = conversation_repo.get_user_conversations(
            "user_123", 
            status="active", 
            topic="test_topic", 
            limit=10, 
            offset=5
        )
        
        assert result == mock_conversations

    def test_count_user_conversations_no_filter(self, conversation_repo, mock_session):
        """Test counting user conversations without filter"""
        mock_session.query.return_value.filter.return_value.count.return_value = 15
        
        result = conversation_repo.count_user_conversations("user_123")
        
        assert result == 15

    def test_count_user_conversations_with_status(self, conversation_repo, mock_session):
        """Test counting user conversations with status filter"""
        mock_query = mock_session.query.return_value
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 8
        
        result = conversation_repo.count_user_conversations("user_123", status="active")
        
        assert result == 8

    def test_update_conversation_success(self, conversation_repo, mock_session, mock_conversation):
        """Test successful conversation update"""
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

    def test_update_conversation_not_found(self, conversation_repo, mock_session):
        """Test conversation update when conversation not found"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = conversation_repo.update_conversation("nonexistent", title="Updated")
        
        assert result is None
        mock_session.commit.assert_not_called()

    def test_update_last_message_time_success(self, conversation_repo, mock_session, mock_conversation):
        """Test successful last message time update"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation
        
        result = conversation_repo.update_last_message_time("test_conv_id")
        
        assert result == mock_conversation
        mock_session.commit.assert_called_once()

    def test_update_last_message_time_not_found(self, conversation_repo, mock_session):
        """Test last message time update when conversation not found"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = conversation_repo.update_last_message_time("nonexistent")
        
        assert result is None

    def test_increment_message_count_success(self, conversation_repo, mock_session, mock_conversation):
        """Test successful message count increment"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation
        mock_conversation.message_count = 5
        
        result = conversation_repo.increment_message_count("test_conv_id")
        
        assert result == mock_conversation
        assert mock_conversation.message_count == 6
        mock_session.commit.assert_called_once()

    def test_increment_message_count_not_found(self, conversation_repo, mock_session):
        """Test message count increment when conversation not found"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = conversation_repo.increment_message_count("nonexistent")
        
        assert result is None

    def test_archive_conversation_success(self, conversation_repo, mock_session, mock_conversation):
        """Test successful conversation archiving"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation
        
        result = conversation_repo.archive_conversation("test_conv_id")
        
        assert result == mock_conversation
        assert mock_conversation.status == "archived"

    def test_archive_conversation_not_found(self, conversation_repo, mock_session):
        """Test conversation archiving when conversation not found"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = conversation_repo.archive_conversation("nonexistent")
        
        assert result is None

    def test_delete_conversation_success(self, conversation_repo, mock_session, mock_conversation):
        """Test successful conversation soft delete"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation
        
        result = conversation_repo.delete_conversation("test_conv_id")
        
        assert result is True
        assert mock_conversation.status == "deleted"

    def test_delete_conversation_not_found(self, conversation_repo, mock_session):
        """Test conversation soft delete when conversation not found"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = conversation_repo.delete_conversation("nonexistent")
        
        assert result is False

    def test_hard_delete_conversation_success(self, conversation_repo, mock_session, mock_conversation):
        """Test successful conversation hard delete"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation
        
        result = conversation_repo.hard_delete_conversation("test_conv_id")
        
        assert result is True
        mock_session.delete.assert_called_once_with(mock_conversation)
        mock_session.commit.assert_called_once()

    def test_hard_delete_conversation_not_found(self, conversation_repo, mock_session):
        """Test conversation hard delete when conversation not found"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = conversation_repo.hard_delete_conversation("nonexistent")
        
        assert result is False
        mock_session.delete.assert_not_called()

    def test_get_or_create_conversation_existing(self, conversation_repo, mock_session, mock_conversation):
        """Test get or create when conversation exists"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation
        mock_conversation.user_id = "user_123"
        
        result = conversation_repo.get_or_create_conversation(
            user_id="user_123",
            conversation_id="test_conv_id"
        )
        
        assert result == mock_conversation

    def test_get_or_create_conversation_wrong_user(self, conversation_repo, mock_session, mock_conversation):
        """Test get or create when conversation exists but belongs to different user"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_conversation
        mock_conversation.user_id = "other_user"
        
        with patch('app.repositories.conversation_repository.Conversation') as mock_conversation_class:
            mock_new_conversation = MagicMock()
            mock_new_conversation.generate_rasa_sender_id = MagicMock()
            mock_conversation_class.return_value = mock_new_conversation
            
            result = conversation_repo.get_or_create_conversation(
                user_id="user_123",
                conversation_id="test_conv_id"
            )
            
            assert result == mock_new_conversation

    def test_get_or_create_conversation_new(self, conversation_repo, mock_session):
        """Test get or create when creating new conversation"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        with patch('app.repositories.conversation_repository.Conversation') as mock_conversation_class:
            mock_new_conversation = MagicMock()
            mock_new_conversation.generate_rasa_sender_id = MagicMock()
            mock_conversation_class.return_value = mock_new_conversation
            
            result = conversation_repo.get_or_create_conversation(
                user_id="user_123",
                title="Custom Title",
                topic="custom_topic"
            )
            
            assert result == mock_new_conversation

    def test_search_conversations(self, conversation_repo, mock_session):
        """Test searching conversations"""
        mock_conversations = [MagicMock(), MagicMock()]
        mock_session.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = mock_conversations
        
        result = conversation_repo.search_conversations(
            user_id="user_123",
            search_term="test search",
            limit=10,
            offset=5
        )
        
        assert result == mock_conversations

    def test_get_recent_conversations(self, conversation_repo, mock_session):
        """Test getting recent conversations"""
        mock_conversations = [MagicMock(), MagicMock()]
        mock_session.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = mock_conversations
        
        result = conversation_repo.get_recent_conversations(limit=5)
        
        assert result == mock_conversations

    def test_get_conversations_by_topic(self, conversation_repo, mock_session):
        """Test getting conversations by topic"""
        mock_conversations = [MagicMock()]
        mock_session.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = mock_conversations
        
        result = conversation_repo.get_conversations_by_topic(
            topic="test_topic",
            limit=15,
            offset=10
        )
        
        assert result == mock_conversations