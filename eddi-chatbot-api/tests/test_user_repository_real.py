import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.repositories.user_repository import UserRepository
from app.models.user import User


@pytest.fixture
def mock_session():
    """Mock database session"""
    return MagicMock(spec=Session)


@pytest.fixture
def user_repo(mock_session):
    """User repository fixture"""
    return UserRepository(mock_session)


@pytest.fixture
def mock_user():
    """Mock user object"""
    user = MagicMock(spec=User)
    user.id = "test_user_id"
    user.email = "test@example.com"
    user.display_name = "Test User"
    user.okta_user_id = "okta_123"
    user.created_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    user.last_active_at = datetime.now(timezone.utc)
    return user


class TestUserRepository:
    """Test UserRepository with actual methods"""

    def test_init(self, mock_session):
        """Test repository initialization"""
        repo = UserRepository(mock_session)
        assert repo.db == mock_session

    def test_create_user_success(self, user_repo, mock_session):
        """Test successful user creation"""
        with patch('app.repositories.user_repository.User') as mock_user_class:
            mock_user_instance = MagicMock()
            mock_user_instance.id = "new_user_id"
            mock_user_class.return_value = mock_user_instance
            
            result = user_repo.create_user(
                email="new@example.com",
                display_name="New User",
                okta_user_id="okta_456"
            )
            
            assert result == mock_user_instance
            mock_session.add.assert_called_once_with(mock_user_instance)
            mock_session.commit.assert_called_once()
            mock_session.refresh.assert_called_once_with(mock_user_instance)

    def test_create_user_with_all_fields(self, user_repo, mock_session):
        """Test user creation with all optional fields"""
        with patch('app.repositories.user_repository.User') as mock_user_class:
            mock_user_instance = MagicMock()
            mock_user_class.return_value = mock_user_instance
            
            result = user_repo.create_user(
                email="complete@example.com",
                display_name="Complete User",
                okta_user_id="okta_789",
                preferred_username="complete_user",
                given_name="Complete",
                family_name="User",
                avatar_url="https://example.com/avatar.jpg",
                preferences={"theme": "dark", "notifications": True}
            )
            
            assert result == mock_user_instance
            mock_session.add.assert_called_once()
            mock_session.commit.assert_called_once()

    def test_create_user_integrity_error(self, user_repo, mock_session):
        """Test user creation with integrity error"""
        mock_session.commit.side_effect = IntegrityError("duplicate key", {}, None)
        
        with patch('app.repositories.user_repository.User'):
            with pytest.raises(ValueError, match="already exists"):
                user_repo.create_user(email="duplicate@example.com")
                
            mock_session.rollback.assert_called_once()

    def test_get_user_by_id_success(self, user_repo, mock_session, mock_user):
        """Test successful user retrieval by ID"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_user
        
        result = user_repo.get_user_by_id("test_user_id")
        
        assert result == mock_user
        mock_session.query.assert_called_once_with(User)

    def test_get_user_by_id_not_found(self, user_repo, mock_session):
        """Test user not found by ID"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = user_repo.get_user_by_id("nonexistent")
        
        assert result is None

    def test_get_user_by_email_success(self, user_repo, mock_session, mock_user):
        """Test successful user retrieval by email"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_user
        
        result = user_repo.get_user_by_email("test@example.com")
        
        assert result == mock_user

    def test_get_user_by_email_not_found(self, user_repo, mock_session):
        """Test user not found by email"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = user_repo.get_user_by_email("nonexistent@example.com")
        
        assert result is None

    def test_get_user_by_okta_id_success(self, user_repo, mock_session, mock_user):
        """Test successful user retrieval by Okta ID"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_user
        
        result = user_repo.get_user_by_okta_id("okta_123")
        
        assert result == mock_user

    def test_get_user_by_okta_id_not_found(self, user_repo, mock_session):
        """Test user not found by Okta ID"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = user_repo.get_user_by_okta_id("nonexistent")
        
        assert result is None

    def test_get_or_create_user_from_okta_existing_user(self, user_repo, mock_session, mock_user):
        """Test get or create when user already exists"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_user
        
        okta_info = {
            "sub": "okta_123",
            "email": "test@example.com",
            "name": "Test User",
            "preferred_username": "testuser",
            "given_name": "Test",
            "family_name": "User",
            "picture": "https://example.com/avatar.jpg"
        }
        
        result = user_repo.get_or_create_user_from_okta(okta_info)
        
        assert result == mock_user
        # Should update user with latest Okta info
        mock_session.commit.assert_called_once()

    def test_get_or_create_user_from_okta_new_user(self, user_repo, mock_session):
        """Test get or create when creating new user"""
        # First query returns None (user doesn't exist)
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        with patch('app.repositories.user_repository.User') as mock_user_class:
            mock_user_instance = MagicMock()
            mock_user_class.return_value = mock_user_instance
            
            okta_info = {
                "sub": "new_okta_id",
                "email": "new@example.com",
                "name": "New User"
            }
            
            result = user_repo.get_or_create_user_from_okta(okta_info)
            
            assert result == mock_user_instance
            mock_session.add.assert_called_once()
            mock_session.commit.assert_called()

    def test_get_or_create_user_from_okta_minimal_info(self, user_repo, mock_session):
        """Test get or create with minimal Okta info"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        with patch('app.repositories.user_repository.User') as mock_user_class:
            mock_user_instance = MagicMock()
            mock_user_class.return_value = mock_user_instance
            
            okta_info = {
                "sub": "minimal_okta_id",
                "email": "minimal@example.com"
            }
            
            result = user_repo.get_or_create_user_from_okta(okta_info)
            
            assert result == mock_user_instance

    def test_update_user_success(self, user_repo, mock_session, mock_user):
        """Test successful user update"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_user
        
        result = user_repo.update_user(
            "test_user_id",
            display_name="Updated Name",
            preferences={"theme": "light"}
        )
        
        assert result == mock_user
        assert mock_user.display_name == "Updated Name"
        assert mock_user.preferences == {"theme": "light"}
        mock_session.commit.assert_called_once()

    def test_update_user_not_found(self, user_repo, mock_session):
        """Test user update when user not found"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = user_repo.update_user("nonexistent", display_name="Updated")
        
        assert result is None
        mock_session.commit.assert_not_called()

    def test_update_last_active_success(self, user_repo, mock_session, mock_user):
        """Test successful last active update"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_user
        
        result = user_repo.update_last_active("test_user_id")
        
        assert result == mock_user
        mock_session.commit.assert_called_once()

    def test_update_last_active_not_found(self, user_repo, mock_session):
        """Test last active update when user not found"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = user_repo.update_last_active("nonexistent")
        
        assert result is None

    def test_delete_user_success(self, user_repo, mock_session, mock_user):
        """Test successful user deletion"""
        mock_session.query.return_value.filter.return_value.first.return_value = mock_user
        
        result = user_repo.delete_user("test_user_id")
        
        assert result is True
        mock_session.delete.assert_called_once_with(mock_user)
        mock_session.commit.assert_called_once()

    def test_delete_user_not_found(self, user_repo, mock_session):
        """Test user deletion when user not found"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        result = user_repo.delete_user("nonexistent")
        
        assert result is False
        mock_session.delete.assert_not_called()
        mock_session.commit.assert_not_called()

    def test_list_users_default_pagination(self, user_repo, mock_session):
        """Test listing users with default pagination"""
        mock_users = [MagicMock(), MagicMock(), MagicMock()]
        mock_session.query.return_value.offset.return_value.limit.return_value.all.return_value = mock_users
        
        result = user_repo.list_users()
        
        assert result == mock_users
        mock_session.query.assert_called_once_with(User)

    def test_list_users_custom_pagination(self, user_repo, mock_session):
        """Test listing users with custom pagination"""
        mock_users = [MagicMock(), MagicMock()]
        mock_session.query.return_value.offset.return_value.limit.return_value.all.return_value = mock_users
        
        result = user_repo.list_users(limit=10, offset=20)
        
        assert result == mock_users

    def test_count_users(self, user_repo, mock_session):
        """Test counting users"""
        mock_session.query.return_value.count.return_value = 42
        
        result = user_repo.count_users()
        
        assert result == 42
        mock_session.query.assert_called_once_with(User)