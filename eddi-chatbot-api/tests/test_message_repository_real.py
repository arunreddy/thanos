import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.repositories.message_repository import MessageRepository
from app.models.message import Message
from app.models.conversation import Conversation


@pytest.fixture
def mock_session():
    """Mock database session"""
    return MagicMock(spec=Session)


@pytest.fixture
def message_repo(mock_session):
    """Message repository fixture"""
    return MessageRepository(mock_session)


@pytest.fixture
def mock_message():
    """Mock message object"""
    message = MagicMock(spec=Message)
    message.id = "test_message_id"
    message.conversation_id = "test_conv_id"
    message.role = "user"
    message.content = "Hello, world!"
    message.created_at = datetime.now(timezone.utc)
    return message


class TestMessageRepository:
    """Test MessageRepository with actual methods"""

    def test_init(self, mock_session):
        """Test repository initialization"""
        repo = MessageRepository(mock_session)
        assert repo.db == mock_session

    def test_create_message_full(self, message_repo, mock_session):
        """Test message creation with all fields"""
        with patch('app.repositories.message_repository.Message') as mock_message_class:
            mock_message_instance = MagicMock()
            mock_message_instance.id = "new_message_id"
            mock_message_class.return_value = mock_message_instance
            
            result = message_repo.create_message(
                conversation_id="conv_123",
                role="assistant",
                content="Hello! How can I help?",
                model_used="rasa",
                intent_name="greet",
                confidence_score=0.95,
                response_time_ms=150,
                buttons=[{"title": "Help", "payload": "/help"}],
                custom_data={"intent": "greet"},
                message_metadata={"source": "web"},
                parent_message_id="parent_123"
            )
            
            assert result == mock_message_instance
            mock_session.add.assert_called_once_with(mock_message_instance)
            mock_session.commit.assert_called_once()
            mock_session.refresh.assert_called_once_with(mock_message_instance)

    def test_create_message_minimal(self, message_repo, mock_session):
        """Test message creation with minimal data"""
        with patch('app.repositories.message_repository.Message') as mock_message_class:
            mock_message_instance = MagicMock()
            mock_message_class.return_value = mock_message_instance
            
            result = message_repo.create_message(
                conversation_id="conv_123",
                role="user",
                content="Hello"
            )
            
            assert result == mock_message_instance

    def test_get_message_by_id_success(self, message_repo, mock_session, mock_message):
        """Test successful message retrieval by ID"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_message
        
        result = message_repo.get_message_by_id("test_message_id")
        
        assert result == mock_message
        mock_session.query.assert_called_once_with(Message)

    def test_get_message_by_id_not_found(self, message_repo, mock_session):
        """Test message not found by ID"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = message_repo.get_message_by_id("nonexistent")
        
        assert result is None

    def test_get_conversation_messages_basic(self, message_repo, mock_session):
        """Test get conversation messages with basic parameters"""
        mock_messages = [MagicMock(), MagicMock()]
        mock_session.query.return_value.filter.return_value.order_by.return_value.all.return_value = mock_messages
        
        result = message_repo.get_conversation_messages("conv_123")
        
        assert result == mock_messages

    def test_get_conversation_messages_with_filters(self, message_repo, mock_session):
        """Test get conversation messages with filters"""
        mock_messages = [MagicMock()]
        mock_query = mock_session.query.return_value
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value.limit.return_value.all.return_value = mock_messages
        
        since_datetime = datetime.now(timezone.utc)
        result = message_repo.get_conversation_messages(
            "conv_123", 
            limit=10, 
            offset=5,
            since=since_datetime,
            role="user"
        )
        
        assert result == mock_messages

    def test_get_conversation_messages_no_limit(self, message_repo, mock_session):
        """Test get conversation messages without limit"""
        mock_messages = [MagicMock(), MagicMock(), MagicMock()]
        mock_query = mock_session.query.return_value
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value.all.return_value = mock_messages
        
        result = message_repo.get_conversation_messages("conv_123", limit=None)
        
        assert result == mock_messages

    def test_get_latest_messages(self, message_repo, mock_session):
        """Test getting latest messages"""
        mock_messages = [MagicMock(), MagicMock()]
        mock_session.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = mock_messages
        
        result = message_repo.get_latest_messages("conv_123", count=5)
        
        assert result == mock_messages

    def test_count_conversation_messages(self, message_repo, mock_session):
        """Test counting conversation messages"""
        mock_session.query.return_value.filter.return_value.count.return_value = 25
        
        result = message_repo.count_conversation_messages("conv_123")
        
        assert result == 25

    def test_update_message_success(self, message_repo, mock_session, mock_message):
        """Test successful message update"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_message
        
        result = message_repo.update_message(
            "test_message_id",
            content="Updated content",
            intent_name="updated_intent"
        )
        
        assert result == mock_message
        assert mock_message.content == "Updated content"
        assert mock_message.intent_name == "updated_intent"
        mock_session.commit.assert_called_once()

    def test_update_message_not_found(self, message_repo, mock_session):
        """Test message update when message not found"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = message_repo.update_message("nonexistent", content="Updated")
        
        assert result is None
        mock_session.commit.assert_not_called()

    def test_delete_message_success(self, message_repo, mock_session, mock_message):
        """Test successful message deletion"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_message
        
        result = message_repo.delete_message("test_message_id")
        
        assert result is True
        mock_session.delete.assert_called_once_with(mock_message)
        mock_session.commit.assert_called_once()

    def test_delete_message_not_found(self, message_repo, mock_session):
        """Test message deletion when message not found"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = message_repo.delete_message("nonexistent")
        
        assert result is False
        mock_session.delete.assert_not_called()

    def test_get_messages_by_intent(self, message_repo, mock_session):
        """Test getting messages by intent"""
        mock_messages = [MagicMock(), MagicMock()]
        mock_session.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = mock_messages
        
        result = message_repo.get_messages_by_intent("greet", limit=25, offset=10)
        
        assert result == mock_messages

    def test_get_messages_by_model(self, message_repo, mock_session):
        """Test getting messages by model"""
        mock_messages = [MagicMock()]
        mock_session.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = mock_messages
        
        result = message_repo.get_messages_by_model("rasa", limit=30, offset=15)
        
        assert result == mock_messages

    def test_search_message_content(self, message_repo, mock_session):
        """Test searching message content"""
        mock_messages = [MagicMock()]
        mock_session.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = mock_messages
        
        result = message_repo.search_message_content(
            "conv_123", 
            "search term", 
            limit=15, 
            offset=5
        )
        
        assert result == mock_messages

    def test_get_user_message_count(self, message_repo, mock_session):
        """Test getting user message count"""
        mock_session.query.return_value.join.return_value.filter.return_value.count.return_value = 42
        
        result = message_repo.get_user_message_count("user_123")
        
        assert result == 42
        mock_session.query.assert_called_once_with(Message)

    def test_get_assistant_responses_with_buttons(self, message_repo, mock_session):
        """Test getting assistant responses with buttons"""
        mock_messages = [MagicMock(), MagicMock()]
        mock_session.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = mock_messages
        
        result = message_repo.get_assistant_responses_with_buttons(limit=25)
        
        assert result == mock_messages

    def test_create_user_message(self, message_repo, mock_session):
        """Test creating user message convenience method"""
        with patch('app.repositories.message_repository.Message') as mock_message_class:
            mock_message_instance = MagicMock()
            mock_message_class.return_value = mock_message_instance
            
            result = message_repo.create_user_message(
                conversation_id="conv_123",
                content="User message",
                message_metadata={"source": "web"}
            )
            
            assert result == mock_message_instance
            mock_session.add.assert_called_once()

    def test_create_assistant_message_minimal(self, message_repo, mock_session):
        """Test creating assistant message with minimal data"""
        with patch('app.repositories.message_repository.Message') as mock_message_class:
            mock_message_instance = MagicMock()
            mock_message_class.return_value = mock_message_instance
            
            result = message_repo.create_assistant_message(
                conversation_id="conv_123",
                content="Assistant response"
            )
            
            assert result == mock_message_instance

    def test_create_assistant_message_full(self, message_repo, mock_session):
        """Test creating assistant message with all parameters"""
        with patch('app.repositories.message_repository.Message') as mock_message_class:
            mock_message_instance = MagicMock()
            mock_message_class.return_value = mock_message_instance
            
            result = message_repo.create_assistant_message(
                conversation_id="conv_123",
                content="Detailed assistant response",
                model_used="gpt-4",
                intent_name="provide_info",
                confidence_score=0.98,
                response_time_ms=200,
                buttons=[{"title": "More Info", "payload": "/info"}],
                custom_data={"analysis": "complex"},
                message_metadata={"enhanced": True}
            )
            
            assert result == mock_message_instance
            mock_session.add.assert_called_once()

    def test_query_chaining_conversation_messages(self, message_repo, mock_session):
        """Test query chaining for conversation messages"""
        # Test that query filters are properly chained
        mock_query = mock_session.query.return_value
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = []
        
        message_repo.get_conversation_messages("conv_123", limit=10, offset=5)
        
        # Verify the query chain was called
        mock_session.query.assert_called_once_with(Message)
        assert mock_query.filter.call_count >= 1
        mock_query.order_by.assert_called_once()
        mock_query.offset.assert_called_once_with(5)
        mock_query.limit.assert_called_once_with(10)

    def test_query_chaining_latest_messages(self, message_repo, mock_session):
        """Test query chaining for latest messages"""
        mock_query = mock_session.query.return_value
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = []
        
        message_repo.get_latest_messages("conv_123", count=5)
        
        mock_session.query.assert_called_once_with(Message)
        mock_query.filter.assert_called_once()
        mock_query.order_by.assert_called_once()
        mock_query.limit.assert_called_once_with(5)