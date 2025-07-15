import os
from typing import Optional
from pydantic import BaseModel


class DatabaseConfig(BaseModel):
    """Database configuration settings"""
    
    # Database connection parameters
    host: str = "localhost"
    port: int = 5432
    database: str = ""
    username: str = ""
    password: str = ""
    
    # Connection pool settings
    pool_size: int = 5
    max_overflow: int = 10
    pool_timeout: int = 30
    pool_recycle: int = 3600
    
    # SSL and other options
    sslmode: str = "disable"
    
    @classmethod
    def from_env(cls) -> "DatabaseConfig":
        """Create database config from environment variables"""
        return cls(
            host=os.getenv("DB_HOST", "eddi-postgres"),  # Use Docker container name
            port=int(os.getenv("DB_PORT", "5432")),
            database=os.getenv("DB_NAME", ""),
            username=os.getenv("DB_USER", ""),
            password=os.getenv("DB_PASSWORD", ""),
            pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
            max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
            pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
            pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "3600")),
            sslmode=os.getenv("DB_SSLMODE", "prefer"),
        )
    
    def get_database_url(self) -> str:
        """Get SQLAlchemy database URL (safe, avoids exposing credentials in logs)"""
        from sqlalchemy.engine import URL
        return str(
            URL.create(
                drivername="postgresql",
                username=self.username,
                password=self.password,
                host=self.host,
                port=self.port,
                database=self.database,
            )
        )
    
    def get_alembic_url(self) -> str:
        """Get database URL for Alembic migrations"""
        return self.get_database_url()