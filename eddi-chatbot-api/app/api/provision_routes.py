"""Provision execute webhook — called by Jenkins after approval.

Jenkins passes the target DB connection details and the chatbot API
creates the database directly, bypassing the Jenkins agent's network
limitations.

Required environment variable:
  PROVISION_WEBHOOK_SECRET  — shared secret that Jenkins sends in the
                              X-Provision-Secret header to authenticate
                              the request.
"""

import logging
import os
from typing import Optional

import psycopg2
from psycopg2 import errors as pg_errors, sql
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

provision_router = APIRouter(prefix="/provision", tags=["provision"])
logger = logging.getLogger(__name__)

_WEBHOOK_SECRET = os.environ.get("PROVISION_WEBHOOK_SECRET", "")


class ProvisionRequest(BaseModel):
    db_name: str
    pg_version: str
    sysid: str
    approver: str


@provision_router.post("/execute")
def execute_provision(
    request: ProvisionRequest,
    x_provision_secret: Optional[str] = Header(None),
):
    """Create a PostgreSQL database using the API's own DB credentials.

    Called by the Jenkins pipeline after the approver clicks Approve in
    Blue Ocean. PG connection details come from the API's environment
    variables — Jenkins does not need to hold any DB credentials.
    """
    if not _WEBHOOK_SECRET or x_provision_secret != _WEBHOOK_SECRET:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: invalid or missing X-Provision-Secret header",
        )

    pg_host     = os.environ["DB_PROVISION_HOST"]
    pg_port     = int(os.environ.get("DB_PROVISION_PORT", 5438))
    pg_user     = os.environ["DB_PROVISION_USER"]
    pg_password = os.environ["DB_PROVISION_PASSWORD"]
    pg_admin_db = os.environ.get("DB_PROVISION_ADMIN_DB", "postgres")

    logger.info(
        "Provision request received: db=%s pg_version=%s sysid=%s approver=%s host=%s:%s",
        request.db_name, request.pg_version, request.sysid,
        request.approver, pg_host, pg_port,
    )

    try:
        conn = psycopg2.connect(
            host=pg_host,
            port=pg_port,
            user=pg_user,
            password=pg_password,
            dbname=pg_admin_db,
            connect_timeout=10,
        )
        conn.autocommit = True  # CREATE DATABASE cannot run inside a transaction
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL("CREATE DATABASE {}").format(sql.Identifier(request.db_name))
            )
        conn.close()

        logger.info(
            "Database '%s' created successfully (approver: %s)",
            request.db_name, request.approver,
        )
        return {
            "success": True,
            "db_name": request.db_name,
            "pg_version": request.pg_version,
            "sysid": request.sysid,
            "approver": request.approver,
            "connection_string": f"postgresql://{pg_user}@{pg_host}:{pg_port}/{request.db_name}",
        }

    except pg_errors.DuplicateDatabase:
        logger.warning("Database '%s' already exists", request.db_name)
        raise HTTPException(
            status_code=409, detail=f"Database '{request.db_name}' already exists"
        )
    except psycopg2.OperationalError as e:
        logger.error("Cannot connect to %s:%s — %s", pg_host, pg_port, e)
        raise HTTPException(
            status_code=502, detail=f"Cannot connect to database host: {e}"
        )
    except Exception as e:
        logger.error("Failed to create database '%s': %s", request.db_name, e)
        raise HTTPException(status_code=500, detail=str(e))
