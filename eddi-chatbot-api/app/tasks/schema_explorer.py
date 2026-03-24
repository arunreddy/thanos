"""
Schema exploration task — runs as a background job via Procrastinate.

This is a stub implementation to prove the worker pattern.
TODO: Port actual schema exploration logic from the old Rasa actions.
"""

import json
from app.worker import task_app


@task_app.task(name="tasks.explore_schema", queue="default")
async def explore_schema(connection_string: str, conversation_id: str, object_types: list[str] | None = None):
    """
    Explore database schema and store results.

    Args:
        connection_string: Database connection string to explore.
        conversation_id: Conversation to post results back to.
        object_types: Optional list of object types to explore (tables, views, indexes, etc.)
    """
    # TODO: Implement actual schema exploration
    # For now, return a mock result
    result = {
        "status": "completed",
        "conversation_id": conversation_id,
        "schema": {
            "tables": ["employees", "departments", "projects"],
            "views": ["employee_summary"],
            "indexes": 12,
        },
        "message": "Schema exploration complete. Found 3 tables, 1 view, and 12 indexes.",
    }

    print(f"[TASK] explore_schema completed for conversation {conversation_id}: {json.dumps(result)}")
    return result
