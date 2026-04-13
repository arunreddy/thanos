import pytest
from datetime import datetime, timezone
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message


class TestUserModel:
    """Test cases for User model"""

    def test_user_creation(self):
        """Test user model creation"""
        user = User(
            email="test@example.com",
            display_name="Test User",
            okta_user_id="okta_123"
        )
        assert user.email == "test@example.com"
        assert user.display_name == "Test User"
        assert user.okta_user_id == "okta_123"
        assert user.preferences is None or user.preferences == {}

    def test_user_creation_minimal(self):
        """Test user model creation with minimal data"""
        user = User(email="minimal@example.com")
        assert user.email == "minimal@example.com"
        assert user.display_name is None

    def test_user_repr(self):
        """Test user string representation"""
        user = User(email="test@example.com", display_name="Test User")
        repr_str = repr(user)
        assert "test@example.com" in repr_str
        assert "Test User" in repr_str

    def test_user_to_dict(self):
        """Test user to_dict method"""
        user = User(
            email="test@example.com",
            display_name="Test User",
            okta_user_id="okta_123",
            preferences={"theme": "dark"}
        )
        user.id = "test-id"
        user.created_at = datetime.now(timezone.utc)
        user.last_active_at = datetime.now(timezone.utc)

        result = user.to_dict()
        
        assert result["email"] == "test@example.com"
        assert result["display_name"] == "Test User"
        assert result["preferences"] == {"theme": "dark"}
        assert "created_at" in result
        assert "last_active_at" in result

    def test_user_to_dict_none_values(self):
        """Test user to_dict with None values"""
        user = User(email="test@example.com")
        user.id = "test-id"
        
        result = user.to_dict()
        
        assert result["email"] == "test@example.com"
        assert result["display_name"] is None


class TestConversationModel:
    """Test cases for Conversation model"""

    def test_conversation_creation(self):
        """Test conversation model creation"""
        conversation = Conversation(
            user_id="user_123",
            title="Test Conversation"
        )
        assert conversation.user_id == "user_123"
        assert conversation.title == "Test Conversation"

    def test_conversation_repr(self):
        """Test conversation string representation"""
        conversation = Conversation(user_id="user_123", title="Test Conversation")
        repr_str = repr(conversation)
        assert "Test Conversation" in repr_str

    def test_conversation_to_dict(self):
        """Test conversation to_dict method"""
        conversation = Conversation(
            user_id="user_123",
            title="Test Conversation"
        )
        conversation.id = "conv_123"
        conversation.created_at = datetime.now(timezone.utc)
        conversation.updated_at = datetime.now(timezone.utc)

        result = conversation.to_dict()
        
        assert result["title"] == "Test Conversation"
        assert result["status"] is None  # No default status set
        if conversation.created_at:
            assert "created_at" in result
        if conversation.updated_at:
            assert "updated_at" in result


class TestMessageModel:
    """Test cases for Message model"""

    def test_message_creation(self):
        """Test message model creation"""
        message = Message(
            conversation_id="conv_123",
            role="user",
            content="Hello, world!"
        )
        assert message.conversation_id == "conv_123"
        assert message.role == "user"
        assert message.content == "Hello, world!"

    def test_message_repr(self):
        """Test message string representation"""
        message = Message(
            conversation_id="conv_123",
            role="user",
            content="Hello, world!"
        )
        repr_str = repr(message)
        assert "Hello, world!" in repr_str

    def test_message_to_dict(self):
        """Test message to_dict method"""
        message = Message(
            conversation_id="conv_123",
            role="assistant",
            content="Hello! How can I help?"
        )
        message.id = "msg_123"
        message.created_at = datetime.now(timezone.utc)

        result = message.to_dict()
        
        # Message to_dict doesn't include conversation_id
        assert result["role"] == "assistant"
        assert result["content"] == "Hello! How can I help?"
        if message.created_at:
            assert "created_at" in result