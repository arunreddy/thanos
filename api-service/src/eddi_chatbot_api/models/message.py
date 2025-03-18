from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Message(BaseModel):
    """Base message model."""

    text: str
    timestamp: datetime = Field(default_factory=datetime.now)
    user_id: Optional[str] = None
    session_id: Optional[str] = None


class UserMessage(Message):
    """Message from user to chatbot."""

    type: str = "user"


class BotMessage(Message):
    """Message from chatbot to user."""

    type: str = "bot"
    source: Optional[str] = None  # e.g., "nlu", "task", "direct"


class TaskStatus(BaseModel):
    """Status update for a long-running task."""

    task_id: str
    status: str  # "pending", "running", "completed", "failed"
    progress: Optional[float] = None  # 0.0 to 1.0
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
