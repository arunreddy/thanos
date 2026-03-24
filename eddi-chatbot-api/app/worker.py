"""
Procrastinate task queue configuration and task definitions.

Usage:
  - Worker:  procrastinate --app=app.worker.task_app worker
  - Schema:  procrastinate --app=app.worker.task_app schema --apply
  - Defer:   await some_task.defer_async(arg=value)
"""

import os
import procrastinate

# Build connection string from environment (same vars as the API)
_db_user = os.getenv("DB_USER", "postgres")
_db_pass = os.getenv("DB_PASSWORD", "postgres")
_db_host = os.getenv("DB_HOST", "localhost")
_db_port = os.getenv("DB_PORT", "5432")
_db_name = os.getenv("DB_NAME", "postgres")

CONNINFO = f"postgres://{_db_user}:{_db_pass}@{_db_host}:{_db_port}/{_db_name}"

# Procrastinate app — used by both the API (to defer) and the worker (to execute)
task_app = procrastinate.App(
    connector=procrastinate.PsycopgConnector(conninfo=CONNINFO),
    import_paths=["app.tasks"],
)
