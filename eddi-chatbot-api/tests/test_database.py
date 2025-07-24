import pytest
import os
from unittest.mock import patch, MagicMock
from app.database.config import DatabaseConfig
from app.database.connection import get_db, init_database, create_all_tables, health_check


class TestDatabaseConfig:
    """Test cases for DatabaseConfig class"""

    def test_database_config_defaults(self):
        """Test database config with default values"""
        config = DatabaseConfig()
        
        assert config.host == "localhost"
        assert config.port == 5432
        assert config.database == ""
        assert config.username == ""
        assert config.password == ""
        assert config.pool_size == 5
        assert config.max_overflow == 10
        assert config.pool_timeout == 30
        assert config.pool_recycle == 3600
        assert config.sslmode == "disable"

    def test_database_config_custom_values(self):
        """Test database config with custom values"""
        config = DatabaseConfig(
            host="custom-host",
            port=5433,
            database="test_db",
            username="test_user",
            password="test_pass",
            pool_size=10,
            max_overflow=20,
            pool_timeout=60,
            pool_recycle=7200,
            sslmode="require"
        )
        
        assert config.host == "custom-host"
        assert config.port == 5433
        assert config.database == "test_db"
        assert config.username == "test_user"
        assert config.password == "test_pass"
        assert config.pool_size == 10
        assert config.max_overflow == 20
        assert config.pool_timeout == 60
        assert config.pool_recycle == 7200
        assert config.sslmode == "require"

    @patch.dict(os.environ, {
        "DB_HOST": "env-host",
        "DB_PORT": "5434",
        "DB_NAME": "env_db",
        "DB_USER": "env_user",
        "DB_PASSWORD": "env_pass",
        "DB_POOL_SIZE": "15",
        "DB_MAX_OVERFLOW": "25",
        "DB_POOL_TIMEOUT": "45",
        "DB_POOL_RECYCLE": "9000",
        "DB_SSLMODE": "prefer"
    })
    def test_database_config_from_env(self):
        """Test database config creation from environment variables"""
        config = DatabaseConfig.from_env()
        
        assert config.host == "env-host"
        assert config.port == 5434
        assert config.database == "env_db"
        assert config.username == "env_user"
        assert config.password == "env_pass"
        assert config.pool_size == 15
        assert config.max_overflow == 25
        assert config.pool_timeout == 45
        assert config.pool_recycle == 9000
        assert config.sslmode == "prefer"

    @patch.dict(os.environ, {}, clear=True)
    def test_database_config_from_env_defaults(self):
        """Test database config from env with default values when env vars not set"""
        config = DatabaseConfig.from_env()
        
        assert config.host == "eddi-postgres"  # Default for Docker
        assert config.port == 5432
        assert config.database == ""
        assert config.username == ""
        assert config.password == ""
        assert config.sslmode == "prefer"

    def test_get_database_url(self):
        """Test database URL generation"""
        config = DatabaseConfig(
            host="test-host",
            port=5432,
            database="test_db",
            username="test_user",
            password="test_pass"
        )
        
        url = config.get_database_url()
        
        assert "postgresql://" in url
        assert "test_user" in url
        assert "***" in url  # Password is masked in the URL
        assert "test-host" in url
        assert "5432" in url
        assert "test_db" in url

    def test_get_database_url_special_characters(self):
        """Test database URL generation with special characters in password"""
        config = DatabaseConfig(
            host="localhost",
            port=5432,
            database="test_db",
            username="user@domain",
            password="pass@word!123"
        )
        
        url = config.get_database_url()
        
        # URL should be properly encoded
        assert "postgresql://" in url
        assert url is not None

    def test_get_alembic_url(self):
        """Test Alembic URL generation"""
        config = DatabaseConfig(
            host="test-host",
            port=5432,
            database="test_db",
            username="test_user",
            password="test_pass"
        )
        
        alembic_url = config.get_alembic_url()
        db_url = config.get_database_url()
        
        assert alembic_url == db_url


class TestDatabaseConnection:
    """Test cases for database connection functions"""

    @patch('app.database.connection.SessionLocal')
    def test_get_db_success(self, mock_session_local):
        """Test successful database session generation"""
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        db_gen = get_db()
        db = next(db_gen)
        
        assert db == mock_db
        mock_session_local.assert_called_once()
        
        # Test cleanup on success
        try:
            next(db_gen)
        except StopIteration:
            pass
        
        mock_db.close.assert_called_once()

    @patch('app.database.connection.SessionLocal')
    def test_get_db_exception_handling(self, mock_session_local):
        """Test database session exception handling"""
        mock_db = MagicMock()
        mock_db.query.side_effect = Exception("Database error")
        mock_session_local.return_value = mock_db
        
        db_gen = get_db()
        db = next(db_gen)
        
        # Simulate an exception during database operation
        try:
            # This would normally be done by FastAPI dependency injection
            raise Exception("Database error")
        except Exception:
            try:
                next(db_gen)
            except StopIteration:
                pass
        
        mock_db.close.assert_called_once()

    @patch('app.database.connection.engine')
    def test_init_database_success(self, mock_engine):
        """Test successful database initialization"""
        mock_connection = MagicMock()
        mock_connection.execute.return_value = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_connection
        
        result = init_database()
        
        assert result is True
        mock_engine.connect.assert_called_once()
        mock_connection.execute.assert_called_once_with("SELECT 1")

    @patch('app.database.connection.engine')
    def test_init_database_failure(self, mock_engine):
        """Test database initialization failure"""
        mock_engine.connect.side_effect = Exception("Connection failed")
        
        with pytest.raises(Exception, match="Connection failed"):
            init_database()

    @patch('app.database.connection.engine')
    @patch('app.models.Base')
    def test_create_all_tables(self, mock_base, mock_engine):
        """Test table creation"""
        mock_metadata = MagicMock()
        mock_base.metadata = mock_metadata
        
        create_all_tables()
        
        mock_metadata.create_all.assert_called_once_with(bind=mock_engine)

    @patch('app.database.connection.engine')
    @patch('app.database.connection.db_config')
    def test_health_check_success(self, mock_db_config, mock_engine):
        """Test successful database health check"""
        mock_connection = MagicMock()
        mock_result = MagicMock()
        mock_result.fetchone.return_value = ["PostgreSQL 13.0"]
        mock_connection.execute.return_value = mock_result
        mock_engine.connect.return_value.__enter__.return_value = mock_connection
        
        mock_db_config.host = "localhost"
        mock_db_config.port = 5432
        mock_db_config.database = "test_db"
        
        result = health_check()
        
        assert result["status"] == "healthy"
        assert result["database"] == "test_db"
        assert result["version"] == "PostgreSQL 13.0"
        assert result["host"] == "localhost"
        assert result["port"] == 5432
        assert result["database"] == "test_db"

    @patch('app.database.connection.engine')
    @patch('app.database.connection.db_config')
    def test_health_check_failure(self, mock_db_config, mock_engine):
        """Test database health check failure"""
        mock_engine.connect.side_effect = Exception("Connection failed")
        
        mock_db_config.host = "localhost"
        mock_db_config.port = 5432
        mock_db_config.database = "test_db"
        
        result = health_check()
        
        assert result["status"] == "unhealthy"
        assert result["error"] == "Connection failed"
        assert result["host"] == "localhost"
        assert result["port"] == 5432
        assert result["database"] == "test_db"

    @patch('app.database.connection.Pool')
    def test_set_sqlite_pragma(self, mock_pool):
        """Test SQLite pragma event listener (no-op for PostgreSQL)"""
        from app.database.connection import set_sqlite_pragma
        
        # This function should do nothing for PostgreSQL
        # Just test that it can be called without error
        mock_connection = MagicMock()
        mock_record = MagicMock()
        
        # Should not raise any exception
        set_sqlite_pragma(mock_connection, mock_record)


class TestDatabaseIntegration:
    """Integration tests for database components"""

    @patch('app.database.connection.engine')
    @patch('app.database.connection.SessionLocal')
    def test_database_session_lifecycle(self, mock_session_local, mock_engine):
        """Test complete database session lifecycle"""
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        # Test session creation and cleanup
        db_gen = get_db()
        db_session = next(db_gen)
        
        assert db_session == mock_db
        
        # Simulate normal completion
        try:
            next(db_gen)
        except StopIteration:
            pass
        
        mock_db.close.assert_called_once()

    def test_database_config_validation(self):
        """Test database configuration validation"""
        # Test with empty values
        config = DatabaseConfig()
        url = config.get_database_url()
        assert url is not None
        
        # Test with all values filled
        config = DatabaseConfig(
            host="localhost",
            port=5432,
            database="test",
            username="user",
            password="pass"
        )
        url = config.get_database_url()
        assert "test" in url

    @patch.dict(os.environ, {
        "DB_HOST": "production-host",
        "DB_PORT": "5432",
        "DB_NAME": "production_db",
        "DB_USER": "prod_user",
        "DB_PASSWORD": "secure_password",
        "DB_SSLMODE": "require"
    })
    def test_production_like_config(self):
        """Test production-like configuration"""
        config = DatabaseConfig.from_env()
        
        assert config.host == "production-host"
        assert config.database == "production_db"
        assert config.username == "prod_user"
        assert config.password == "secure_password"
        assert config.sslmode == "require"
        
        url = config.get_database_url()
        assert "postgresql://" in url
        assert "production-host" in url
        assert "production_db" in url