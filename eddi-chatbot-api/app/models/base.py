from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from typing import Any

# Create declarative base for all models
Base: Any = declarative_base()

# Session factory will be configured by database module
SessionLocal = None
engine = None