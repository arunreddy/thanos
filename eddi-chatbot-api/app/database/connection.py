import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import Pool
from typing import Generator
from .config import DatabaseConfig

# Configure logging
logger = logging.getLogger(__name__)

# Global database configuration
db_config = DatabaseConfig.from_env()

# Create SQLAlchemy engine
engine = create_engine(
    db_config.get_database_url(),
    pool_size=db_config.pool_size,
    max_overflow=db_config.max_overflow,
    pool_timeout=db_config.pool_timeout,
    pool_recycle=db_config.pool_recycle,
    echo=False,  # Set to True for SQL query logging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@event.listens_for(Pool, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Set database connection parameters"""
    # This is for PostgreSQL, so we don't need SQLite pragmas
    # But we could set PostgreSQL-specific connection parameters here if needed
    pass


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session.
    Use this in FastAPI endpoints with Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def init_database():
    """Initialize database connection and verify connectivity"""
    try:
        # Test database connection
        with engine.connect() as connection:
            result = connection.execute("SELECT 1")
            logger.info("Database connection successful")
            return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise


def create_all_tables():
    """Create all tables (for development/testing)"""
    from app.models import Base
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")


def health_check() -> dict:
    """Check database health"""
    try:
        with engine.connect() as connection:
            result = connection.execute("SELECT version()")
            version = result.fetchone()[0]
            return {
                "status": "healthy",
                "database": "postgresql",
                "version": version,
                "host": db_config.host,
                "port": db_config.port,
                "database": db_config.database
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "host": db_config.host,
            "port": db_config.port,
            "database": db_config.database
        }