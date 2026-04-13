import os
import sys
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

# Add the root directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import fixtures that can be shared across tests
pytest_plugins = []


@pytest.fixture
def mock_db_session():
    """Mock database session for testing"""
    mock_session = MagicMock()
    mock_session.add = MagicMock()
    mock_session.commit = MagicMock()
    mock_session.rollback = MagicMock()
    mock_session.close = MagicMock()
    mock_session.query = MagicMock()
    mock_session.execute = MagicMock()
    return mock_session


@pytest.fixture
def mock_user():
    """Mock user object for testing"""
    user = MagicMock()
    user.id = "test_user_id"
    user.email = "test@example.com"
    user.display_name = "Test User"
    user.created_at = datetime.now(timezone.utc)
    user.last_active = datetime.now(timezone.utc)
    return user


@pytest.fixture
def mock_conversation():
    """Mock conversation object for testing"""
    conversation = MagicMock()
    conversation.id = "test_conversation_id"
    conversation.user_id = "test_user_id"
    conversation.title = "Test Conversation"
    conversation.rasa_sender_id = "test_rasa_sender"
    conversation.created_at = datetime.now(timezone.utc)
    conversation.updated_at = datetime.now(timezone.utc)
    conversation.message_count = 0
    conversation.messages = []
    return conversation


@pytest.fixture
def mock_message():
    """Mock message object for testing"""
    message = MagicMock()
    message.id = "test_message_id"
    message.conversation_id = "test_conversation_id"
    message.role = "user"
    message.content = "Test message"
    message.metadata = {}
    
    # Mock created_at with proper isoformat method
    mock_created_at = MagicMock()
    mock_created_at.isoformat.return_value = datetime.now(timezone.utc).isoformat()
    message.created_at = mock_created_at
    
    return message


@pytest.fixture(autouse=True)
def mock_database_connections():
    """Automatically mock database connections for all tests"""
    with patch('app.database.connection.engine') as mock_engine, \
         patch('app.database.connection.SessionLocal') as mock_session_local, \
         patch('app.database.get_db') as mock_get_db:
        
        # Mock the engine
        mock_engine.connect.return_value.__enter__.return_value.execute.return_value.fetchone.return_value = ["PostgreSQL 13.0"]
        
        # Mock SessionLocal
        mock_session = MagicMock()
        mock_session_local.return_value = mock_session
        
        # Mock get_db dependency
        def mock_get_db_generator():
            yield mock_session
        mock_get_db.return_value = mock_get_db_generator()
        
        yield {
            'engine': mock_engine,
            'session_local': mock_session_local,
            'get_db': mock_get_db,
            'session': mock_session
        }


@pytest.fixture
def mock_repositories(mock_user, mock_conversation, mock_message):
    """Mock all repository methods for testing"""
    with patch('app.services.chat_service.UserRepository') as mock_user_repo, \
         patch('app.services.chat_service.ConversationRepository') as mock_conv_repo, \
         patch('app.services.chat_service.MessageRepository') as mock_msg_repo:
        
        # Configure user repository mocks
        mock_user_repo_instance = mock_user_repo.return_value
        mock_user_repo_instance.get_user_by_email.return_value = mock_user
        mock_user_repo_instance.create_user.return_value = mock_user
        mock_user_repo_instance.update_last_active.return_value = None
        
        # Configure conversation repository mocks
        mock_conv_repo_instance = mock_conv_repo.return_value
        
        # Ensure mock_conversation has proper id attribute
        mock_conversation.id = "test_conversation_id"
        mock_conversation.rasa_sender_id = "test_rasa_sender_id"
        
        mock_conv_repo_instance.get_conversation_by_id.return_value = mock_conversation
        mock_conv_repo_instance.create_conversation.return_value = mock_conversation
        mock_conv_repo_instance.get_or_create_conversation.return_value = mock_conversation
        mock_conv_repo_instance.get_user_conversations.return_value = [{
            "id": "test_conversation_id",
            "user_id": "test_user_id", 
            "title": "Test Conversation",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "message_count": 0
        }]
        mock_conv_repo_instance.delete_conversation.return_value = True
        mock_conv_repo_instance.increment_message_count.return_value = None
        
        # Configure message repository mocks  
        mock_msg_repo_instance = mock_msg_repo.return_value
        
        # Create a proper mock message with created_at that has isoformat method
        mock_message_with_timestamp = MagicMock()
        mock_message_with_timestamp.id = "test_message_id"
        mock_message_with_timestamp.conversation_id = "test_conversation_id"
        mock_message_with_timestamp.role = "assistant"
        mock_message_with_timestamp.content = "Test response"
        
        # Create a proper datetime mock
        mock_datetime = MagicMock()
        mock_datetime.isoformat.return_value = datetime.now(timezone.utc).isoformat()
        mock_message_with_timestamp.created_at = mock_datetime
        
        mock_msg_repo_instance.create_user_message.return_value = mock_message_with_timestamp
        mock_msg_repo_instance.create_assistant_message.return_value = mock_message_with_timestamp
        # Create actual message dict instead of MagicMock
        message_dict = {
            "id": "test_message_id",
            "conversation_id": "test_conversation_id",
            "role": "user",
            "content": "Test message",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {}
        }
        
        # Create mock message with to_dict method that returns the actual dict
        mock_message_with_dict = MagicMock()
        mock_message_with_dict.to_dict.return_value = message_dict
        
        mock_msg_repo_instance.get_conversation_messages.return_value = [mock_message_with_dict]
        
        # Add to_dict method to mock objects
        mock_message.to_dict.return_value = {
            "id": "test_message_id",
            "conversation_id": "test_conversation_id",
            "role": "user",
            "content": "Test message",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {}
        }
        
        mock_conversation.to_dict.return_value = {
            "id": "test_conversation_id",
            "user_id": "test_user_id",
            "title": "Test Conversation",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "message_count": 0
        }
        
        yield {
            'user_repo': mock_user_repo_instance,
            'conversation_repo': mock_conv_repo_instance,
            'message_repo': mock_msg_repo_instance
        }


@pytest.fixture
def mock_rasa_connector():
    """Mock Rasa connector for testing"""
    with patch('app.connectors.rasa_connector.RasaConnector') as mock_rasa:
        mock_instance = mock_rasa.return_value
        mock_instance.send_message.return_value = {
            'responses': [{'text': 'Test response'}],
            'buttons': []
        }
        mock_instance.close.return_value = None
        yield mock_instance