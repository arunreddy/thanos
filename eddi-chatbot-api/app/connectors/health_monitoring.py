"""Health Monitoring — DBQ Metrics API + Datadog integration.

Two parallel flows:

Flow A — DBQ Metrics (default for all DB types):
  1. Parse database type (POSTGRES, ORACLE, MYSQL, MONGODB)
  2. Ask for resource name and sys ID
  3. Resolve resource ID by calling GET /resources?db_type=<db_type>
  4. Ask for start timestamp
  5. Ask for end timestamp
  6. Fetch and return metrics

Flow B — Datadog (triggered when user mentions "datadog" + postgres):
  1. Detect "datadog" keyword in message
  2. Ask for RDS instance identifier (default provided)
  3. Fetch avg metrics from Datadog for the last 15 minutes
  4. Return avg value of each metric

Supports multi-turn conversation for both flows.

MOCK MODE: Set USE_MOCK_DATA=true to return mock data without calling external APIs.
This is useful for local development and UI testing.

Required environment variables:
  DBQ_API_BASE_URL        - Base URL (default: https://dbq-dev.p2.paas.citizensbank.com/api/v1)
  DBQ_API_AUTH_TOKEN      - Bearer token for authentication
  DBQ_API_CLIENT_APP_NAME - Client app name header (default: test)
  DD_API_KEY              - Datadog API key (Flow B)
  DD_APP_KEY              - Datadog application key (Flow B)
  USE_MOCK_DATA           - Set to "true" to use mock data (default: true for local dev)
"""

import asyncio
import logging
import os
import random
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

# Retry configuration for DBQ API calls
_RETRY_ATTEMPTS = 3
_RETRY_BACKOFF  = [0.5, 1.0, 2.0]   # wait seconds before each retry attempt

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DBQ_BASE_URL = os.environ.get(
    "DBQ_API_BASE_URL",
    "https://dbq-dev.p2.paas.citizensbank.com/api/v1"
)
DBQ_CLIENT_APP_NAME = os.environ.get("DBQ_API_CLIENT_APP_NAME", "test")
DBQ_AUTH_TOKEN = os.environ.get("DBQ_API_AUTH_TOKEN", "")
DEFAULT_DB_TYPE = "POSTGRES"

# Mock mode for local development - enabled by default when no auth token is configured
USE_MOCK_DATA = os.environ.get("USE_MOCK_DATA", "true").lower() == "true" or not DBQ_AUTH_TOKEN

# Default metrics shown on snapshot (pre-ticked in UI)
DEFAULT_METRICS = [
    "cpu_utilization",
    "disk_space_usage",
    "freeable_memory",
    "number_of_active_connections",
    "percentage_of_read_requests_served_by_the_buffer_cache",
    "number_of_transactions_per_second",
]

CATALOG_CACHE_TTL   = 3600   # catalog cached for 1 hour
RESOURCES_CACHE_TTL = 300    # resource list cached for 5 minutes
_PENDING_TTL        = 600    # abandon stale conversation state after 10 minutes
_FETCH_TIMEOUT      = 60     # overall timeout (seconds) for a full metrics fetch

# ---------------------------------------------------------------------------
# In-memory caches
# ---------------------------------------------------------------------------

_catalog_cache:   Dict[str, Any] = {}   # {db_type: {"metrics": [...], "expires_at": float}}
_resources_cache: Dict[str, Any] = {}   # {db_type: {"resources": [...], "expires_at": float}}

# ---------------------------------------------------------------------------
# Per-conversation pending state
# Keyed by conversation_id — prevents different users clobbering each other.
# Each entry has an "expires_at" field; stale state is ignored automatically.
# ---------------------------------------------------------------------------

_pending_requests: Dict[str, Dict[str, Any]] = {}


def _get_pending(conversation_id: str) -> Dict[str, Any]:
    """Return pending state for this conversation, or {} if expired/absent."""
    state = _pending_requests.get(conversation_id, {})
    if state and time.time() > state.get("expires_at", 0):
        _pending_requests.pop(conversation_id, None)
        return {}
    return state


def _set_pending(conversation_id: str, **kwargs) -> None:
    """Save pending state for this conversation with a rolling TTL."""
    _pending_requests[conversation_id] = {**kwargs, "expires_at": time.time() + _PENDING_TTL}


def _clear_pending(conversation_id: str) -> None:
    """Discard pending state for this conversation."""
    _pending_requests.pop(conversation_id, None)

# ---------------------------------------------------------------------------
# DBQ API Client
# ---------------------------------------------------------------------------


class DBQClient:
    """Client for DBQ Metrics API."""

    def __init__(self, base_url: str = DBQ_BASE_URL):
        self.base_url = base_url.rstrip("/")

    def _get_headers(self, jwt_token: Optional[str] = None) -> Dict[str, str]:
        """Build request headers."""
        token = jwt_token or DBQ_AUTH_TOKEN
        return {
            "X-Client-App-Name": DBQ_CLIENT_APP_NAME,
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
        }

    async def _get_with_retry(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        jwt_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """GET with automatic retries and exponential back-off.

        Retries on transient errors (5xx, timeout, connection error).
        Does NOT retry on 4xx (auth/not-found — retrying won't help).
        """
        headers = self._get_headers(jwt_token)
        last_exc: Exception = RuntimeError("No attempts made")

        for attempt, backoff in enumerate(
            [0.0] + _RETRY_BACKOFF[: _RETRY_ATTEMPTS - 1]
        ):
            if backoff:
                await asyncio.sleep(backoff)
            try:
                async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
                    response = await client.get(url, params=params, headers=headers)
                    if response.status_code in (401, 403, 404):
                        response.raise_for_status()   # propagate immediately
                    if response.status_code >= 500:
                        logger.warning(
                            "DBQ API %s returned %s (attempt %d/%d)",
                            url, response.status_code, attempt + 1, _RETRY_ATTEMPTS,
                        )
                        last_exc = httpx.HTTPStatusError(
                            f"Server error {response.status_code}",
                            request=response.request,
                            response=response,
                        )
                        continue
                    response.raise_for_status()
                    return response.json()
            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                logger.warning(
                    "DBQ API %s transient error %s (attempt %d/%d)",
                    url, exc, attempt + 1, _RETRY_ATTEMPTS,
                )
                last_exc = exc
                continue
            except httpx.HTTPStatusError:
                raise   # 4xx — don't retry

        raise last_exc

    async def get_db_types(self, jwt_token: Optional[str] = None) -> Dict[str, Any]:
        """Get available database types."""
        return await self._get_with_retry(
            f"{self.base_url}/dbtypes", jwt_token=jwt_token
        )

    async def get_resources(self, db_type: str, jwt_token: Optional[str] = None) -> Dict[str, Any]:
        """Get all resources for a given db_type."""
        return await self._get_with_retry(
            f"{self.base_url}/resources",
            params={"db_type": db_type.upper()},
            jwt_token=jwt_token,
        )

    async def get_metrics_catalog(self, db_type: str, jwt_token: Optional[str] = None) -> Dict[str, Any]:
        """Get available metrics catalog for a given db_type."""
        return await self._get_with_retry(
            f"{self.base_url}/metrics/catalog",
            params={"db_type": db_type.upper()},
            jwt_token=jwt_token,
        )

    async def get_metrics(
        self,
        metric: str,
        resource_id: str,
        start_ts: str,
        end_ts: str,
        step: str = "15m",
        jwt_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get metric values for a resource."""
        return await self._get_with_retry(
            f"{self.base_url}/metrics",
            params={
                "metric": metric,
                "resource_id": resource_id,
                "start_ts": start_ts,
                "end_ts": end_ts,
                "step": step,
            },
            jwt_token=jwt_token,
        )


# Global client instance
_client = DBQClient()

# ---------------------------------------------------------------------------
# Metrics catalog — fetched dynamically, cached in Redis
# ---------------------------------------------------------------------------


async def get_db_metrics_catalog(db_type: str, jwt_token: Optional[str] = None) -> List[Dict[str, Any]]:
    """Return the list of available metrics for db_type (DATABASE level).

    Results are cached in-memory for CATALOG_CACHE_TTL seconds.
    On failure the DEFAULT_METRICS list is used and cached for a shorter
    period (60 s) so the next startup attempt retries reasonably soon.
    Each item: {"metric": str, "unit": str, "description": str}
    """
    import time
    key = db_type.upper()
    entry = _catalog_cache.get(key)
    if entry and time.time() < entry["expires_at"]:
        return entry["metrics"]

    try:
        data = await _client.get_metrics_catalog(db_type, jwt_token)
        resource_levels = data.get("data", {}).get("resource_levels", [])
        db_level = next(
            (lvl for lvl in resource_levels if lvl.get("level_name") == "DATABASE"),
            None,
        )
        metrics = db_level.get("metrics", []) if db_level else []
    except Exception as exc:
        logger.warning("Failed to fetch metrics catalog for %s: %s", db_type, exc)
        metrics = []

    if metrics:
        _catalog_cache[key] = {"metrics": metrics, "expires_at": time.time() + CATALOG_CACHE_TTL}
    else:
        # Cache the fallback briefly so we don't hammer the API on every request
        fallback = [{"metric": m, "unit": "", "description": ""} for m in DEFAULT_METRICS]
        _catalog_cache[key] = {"metrics": fallback, "expires_at": time.time() + 60}
        return fallback

    return metrics


# ---------------------------------------------------------------------------
# Parsing functions
# ---------------------------------------------------------------------------


def _parse_db_type(message: str) -> str:
    """Extract database type from message."""
    msg_lower = message.lower()

    if "oracle" in msg_lower:
        return "ORACLE"
    if "mysql" in msg_lower or "my sql" in msg_lower:
        return "MYSQL"
    if "mongo" in msg_lower or "mongodb" in msg_lower:
        return "MONGODB"
    if "postgres" in msg_lower or "postgresql" in msg_lower or re.search(r'\bpg\b', msg_lower):
        return "POSTGRES"

    return DEFAULT_DB_TYPE


def _parse_resource_name(message: str) -> Optional[str]:
    """Extract resource name from message (e.g., aas_log_db, ablnexus_db)."""
    # Remove sys_id pattern first
    cleaned = re.sub(r'\bSYSID-\d+\b', ' ', message, flags=re.IGNORECASE)
    # Remove known noise keywords
    cleaned = re.sub(
        r'\b(postgres(?:ql)?|oracle|mysql|mongodb|mongo|metrics?|health|show|get|me|for|the|'
        r'database|db|last|hours?|days?|minutes?|weeks?|hrs?|mins?|and|a|an|of|resource|name|'
        r'sys|id|please|provide|with|my|its?)\b',
        ' ', cleaned, flags=re.IGNORECASE
    )
    # Remove ISO timestamps and standalone numbers
    cleaned = re.sub(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\w.Z]*', ' ', cleaned)
    cleaned = re.sub(r'\b\d+\b', ' ', cleaned)

    # Find resource name: lowercase word that contains underscore or is at least 3 chars
    matches = re.findall(r'\b([a-z][a-z0-9_\-]{2,})\b', cleaned.lower())
    if matches:
        return max(matches, key=len)
    return None


def _parse_sys_id(message: str) -> Optional[str]:
    """Extract sys ID from message (e.g., SYSID-06903)."""
    match = re.search(r'\b(SYSID-\d+)\b', message, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    return None


def _parse_timestamps(message: str) -> tuple[Optional[str], Optional[str]]:
    """Extract start and end timestamps. Returns format: 2026-02-12T16:38:43.000Z

    Returns (None, None) if no timestamp provided.
    """
    msg_lower = message.lower()
    now = datetime.now(timezone.utc)

    def format_ts(dt: datetime) -> str:
        return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")

    # "last X hours/days/minutes" — returns both start and end
    last_pattern = r'last\s+(\d+)\s*(hour|hr|day|minute|min|week)s?'
    match = re.search(last_pattern, msg_lower)
    if match:
        amount = int(match.group(1))
        unit = match.group(2)

        if unit in ('hour', 'hr'):
            delta = timedelta(hours=amount)
        elif unit == 'day':
            delta = timedelta(days=amount)
        elif unit in ('minute', 'min'):
            delta = timedelta(minutes=amount)
        elif unit == 'week':
            delta = timedelta(weeks=amount)
        else:
            return None, None

        return format_ts(now - delta), format_ts(now)

    # No timestamp found
    return None, None


def _parse_single_timestamp(message: str) -> Optional[str]:
    """Parse a single timestamp from user input.

    Supports:
      - ISO format: 2026-02-12T16:38:43.000Z
      - Date only:  2026-02-12  (assumes 00:00:00)
      - "now"       → current UTC time
      - Relative:   "2 hours ago", "30 minutes ago"
    """
    text = message.strip()
    now = datetime.now(timezone.utc)

    def format_ts(dt: datetime) -> str:
        return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")

    # "now"
    if text.lower() == "now":
        return format_ts(now)

    # ISO format: 2026-02-12T16:38:43.000Z or 2026-02-12T16:38:43Z
    iso_match = re.match(r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.\d+)?Z?$', text)
    if iso_match:
        try:
            dt = datetime.strptime(iso_match.group(1), "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
            return format_ts(dt)
        except ValueError:
            pass

    # Date only: 2026-02-12
    date_match = re.match(r'^(\d{4}-\d{2}-\d{2})$', text)
    if date_match:
        try:
            dt = datetime.strptime(date_match.group(1), "%Y-%m-%d").replace(tzinfo=timezone.utc)
            return format_ts(dt)
        except ValueError:
            pass

    # Relative: "2 hours ago", "30 minutes ago"
    rel_match = re.search(r'(\d+)\s*(hour|hr|day|minute|min|week)s?\s*ago', text.lower())
    if rel_match:
        amount = int(rel_match.group(1))
        unit = rel_match.group(2)
        if unit in ('hour', 'hr'):
            delta = timedelta(hours=amount)
        elif unit == 'day':
            delta = timedelta(days=amount)
        elif unit in ('minute', 'min'):
            delta = timedelta(minutes=amount)
        elif unit == 'week':
            delta = timedelta(weeks=amount)
        else:
            return None
        return format_ts(now - delta)

    return None


# ---------------------------------------------------------------------------
# Response builders
# ---------------------------------------------------------------------------


def _build_metrics_response(
    resource_id: str,
    resource_name: str,
    db_type: str,
    start_ts: str,
    end_ts: str,
    vitals: Dict[str, Any],
    metrics_history: list,
    catalog: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Build the metrics response."""
    display = f"{resource_name} (ID: {resource_id})" if resource_name else resource_id
    lines = [f"**Health Metrics for {display}**\n"]
    lines.append(f"Database Type: **{db_type}**")
    lines.append(f"Time Range: {start_ts} to {end_ts}")

    # Build available_metrics list for frontend dropdown
    available_metrics = [
        {"metric": m["metric"], "unit": m.get("unit", ""), "description": m.get("description", "")}
        for m in catalog
    ] if catalog else [{"metric": m, "unit": "", "description": ""} for m in DEFAULT_METRICS]

    return {
        "text": "\n".join(lines),
        "buttons": [],
        "custom": {
            "form_type": "health",
            "text": f"Health metrics for {display}",
            "objects": {
                "resource_id": resource_id,
                "resource_name": resource_name,
                "db_type": db_type,
                "start_ts": start_ts,
                "end_ts": end_ts,
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "vitals": vitals,
                "metrics_history": metrics_history,
                "available_metrics": available_metrics,
                "default_metrics": DEFAULT_METRICS,
            },
        },
    }


def _build_error(title: str, message: str) -> Dict[str, Any]:
    """Build error response."""
    return {
        "text": f"**{title}**\n\n{message}",
        "buttons": [],
        "custom": {"error": True},
    }


def _build_ask_resource_name(db_type: str) -> Dict[str, Any]:
    """Ask user for resource name and sys ID."""
    return {
        "text": (
            f"Sure, I can get **{db_type}** metrics for you.\n\n"
            "Please provide the **resource name** and **sys ID** of the database.\n\n"
            "Example: `aas_log_db SYSID-06903`"
        ),
        "buttons": [],
        "custom": {"awaiting": "resource_name", "db_type": db_type},
    }


def _build_ask_sys_id(db_type: str, resource_name: str, candidates: list) -> Dict[str, Any]:
    """Ask user to disambiguate when multiple sys IDs share the same resource name."""
    rows = "\n".join(
        f"- resource_id `{r['resource_id']}` — sys_id `{r['sys_id']}`"
        for r in candidates
    )
    return {
        "text": (
            f"Multiple resources found for **{resource_name}**:\n\n{rows}\n\n"
            "Please provide the **sys ID** to identify the correct resource.\n\n"
            "Example: `SYSID-06903`"
        ),
        "buttons": [],
        "custom": {
            "awaiting": "sys_id",
            "db_type": db_type,
            "resource_name": resource_name,
            "candidates": candidates,
        },
    }


def _build_ask_start_time(db_type: str, resource_name: str, resource_id: str) -> Dict[str, Any]:
    """Ask user for start time."""
    return {
        "text": (
            f"Got it. Resource: **{resource_name}** (ID: `{resource_id}`, {db_type})\n\n"
            "Please provide the **start time**.\n\n"
            "Example: `2026-02-12T16:38:43.000Z` or `last 2 hours`"
        ),
        "buttons": [],
        "custom": {"awaiting": "start_time", "db_type": db_type, "resource_id": resource_id, "resource_name": resource_name},
    }


def _build_ask_end_time(db_type: str, resource_id: str, start_ts: str, resource_name: str = "") -> Dict[str, Any]:
    """Ask user for end time."""
    return {
        "text": f"Start time: **{start_ts}**\n\nPlease provide the **end time**.\n\nExample: `2026-02-12T18:38:43.000Z` or `now`",
        "buttons": [],
        "custom": {"awaiting": "end_time", "db_type": db_type, "resource_id": resource_id, "resource_name": resource_name, "start_ts": start_ts},
    }


# ---------------------------------------------------------------------------
# Datadog configuration
# ---------------------------------------------------------------------------

DD_BASE_URL         = "https://api.datadoghq.com"
DD_DEFAULT_INSTANCE = "cfg-shared-p-2-hnb-chatbot-us-east-1-dev-standalone-postgres"
DD_DEFAULT_REGION   = "us-east-1"

# (display_key, dd_aggregation, dd_metric_name, transform_fn | None)
_DD_METRICS = [
    ("cpu_utilization_pct", "avg", "aws.rds.cpuutilization",        lambda v: round(v, 2)),
    ("freeable_memory_mb",  "avg", "aws.rds.freeable_memory",        lambda v: round(v / (1024 ** 2), 2)),
    ("read_iops",           "avg", "aws.rds.read_iops",              lambda v: round(v, 2)),
    ("write_iops",          "avg", "aws.rds.write_iops",             lambda v: round(v, 2)),
    ("read_latency_ms",     "avg", "aws.rds.read_latency",           lambda v: round(v * 1000, 2)),
    ("write_latency_ms",    "avg", "aws.rds.write_latency",          lambda v: round(v * 1000, 2)),
    # ("container_restarts",  "sum", "kubernetes.containers.restarts",  lambda v: int(round(v))),  # disabled: sum across all infra is misleading
]

_DD_DEFAULT_METRICS = [m[0] for m in _DD_METRICS]

_DD_METRIC_UNITS = {
    "cpu_utilization_pct": "%",
    "freeable_memory_mb":  "MB",
    "read_iops":           "count/s",
    "write_iops":          "count/s",
    "read_latency_ms":     "ms",
    "write_latency_ms":    "ms",
    "container_restarts":  "count",
}

_DD_METRIC_DESC = {
    "cpu_utilization_pct": "RDS CPU utilization percentage",
    "freeable_memory_mb":  "Freeable memory in megabytes",
    "read_iops":           "Average read I/O operations per second",
    "write_iops":          "Average write I/O operations per second",
    "read_latency_ms":     "Average read latency in milliseconds",
    "write_latency_ms":    "Average write latency in milliseconds",
    "container_restarts":  "Kubernetes container restart count",
}


def _dd_headers() -> Dict[str, str]:
    """Build Datadog request headers — read env vars at call time."""
    return {
        "Content-Type":       "application/json",
        "DD-API-KEY":         os.environ.get("DD_API_KEY", ""),
        "DD-APPLICATION-KEY": os.environ.get("DD_APP_KEY", ""),
    }


def _dd_extract_avg(response_json: dict) -> Optional[float]:
    """Extract average of non-null values from a Datadog v2 timeseries response.

    The v2 /api/v2/query/timeseries endpoint returns:
      data.attributes.times  — list of epoch-ms timestamps
      data.attributes.values — list-of-lists (one per query); index 0 is our query
    """
    try:
        values_list = response_json["data"]["attributes"]["values"][0]
        values = [v for v in values_list if v is not None]
        return round(sum(values) / len(values), 4) if values else None
    except (KeyError, IndexError, TypeError):
        return None


def _dd_extract_last(response_json: dict) -> Optional[float]:
    """Extract the most recent non-null value from a Datadog v2 timeseries response.

    Used for cumulative counters (e.g. container_restarts) where averaging
    across time points is meaningless — we want the latest snapshot value.
    """
    try:
        values_list = response_json["data"]["attributes"]["values"][0]
        # Walk in reverse to find the last non-null data point
        for v in reversed(values_list):
            if v is not None:
                return v
        return None
    except (KeyError, IndexError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Datadog flow helpers
# ---------------------------------------------------------------------------


def _is_datadog_request(message: str) -> bool:
    """Return True when the user explicitly mentions Datadog."""
    return "datadog" in message.lower()


def _parse_rds_instance(message: str) -> Optional[str]:
    """Try to extract an RDS instance identifier from the message.

    RDS instance names look like:
      cfg-shared-p-2-hnb-chatbot-us-east-1-dev-standalone-postgres
    They contain hyphens and are longer than ordinary words.
    """
    noise = {
        "postgres", "postgresql", "datadog", "health", "metrics", "show",
        "get", "me", "for", "the", "last", "hours", "hour", "days", "day",
        "minutes", "minute", "from", "in", "of", "a", "an", "and",
    }
    candidates = [
        tok for tok in re.findall(r'[a-z0-9][a-z0-9\-]{4,}', message.lower())
        if "-" in tok and tok not in noise
    ]
    return candidates[0] if candidates else None


def _build_ask_datadog_instance() -> Dict[str, Any]:
    """Ask the user for the RDS instance identifier."""
    return {
        "text": (
            "Sure, I can fetch **Datadog** health metrics for your PostgreSQL instance.\n\n"
            "Please provide the **RDS instance identifier**, or type `default` to use:\n\n"
            f"`{DD_DEFAULT_INSTANCE}`"
        ),
        "buttons": [{"title": "Use default instance", "payload": "default"}],
        "custom": {"awaiting": "datadog_instance"},
    }


def _build_ask_datadog_start_time(instance: str) -> Dict[str, Any]:
    """Ask user for Datadog query start time."""
    return {
        "text": (
            f"Got it. Instance: **{instance}**\n\n"
            "Please provide the **start time**.\n\n"
            "Example: `2026-02-12T16:38:43.000Z` or `last 2 hours`"
        ),
        "buttons": [],
        "custom": {"awaiting": "datadog_start_time", "instance": instance},
    }


def _build_ask_datadog_end_time(instance: str, start_ts: str) -> Dict[str, Any]:
    """Ask user for Datadog query end time."""
    return {
        "text": f"Start time: **{start_ts}**\n\nPlease provide the **end time**.\n\nExample: `2026-02-12T18:38:43.000Z` or `now`",
        "buttons": [],
        "custom": {"awaiting": "datadog_end_time", "instance": instance, "start_ts": start_ts},
    }


def _build_datadog_response(health: dict) -> Dict[str, Any]:
    """Build a chart-renderable response. Uses form_type='health' so the
    frontend renders the same chart UI as the DBQ flow."""
    if "error" in health:
        return _build_error("Datadog Error", health["error"])

    instance = health.get("instance", "unknown")
    start_ts = health.get("from_ts", "")
    end_ts   = health.get("to_ts", "")
    vitals   = health.get("vitals", {})
    history  = health.get("metrics_history", [])
    avail    = health.get("available_metrics", [])
    defaults = health.get("default_metrics", list(vitals.keys()))

    lines = [
        f"**Datadog Health Metrics** — `{instance}`",
        f"Time Range: {start_ts} to {end_ts}",
    ]

    return {
        "text": "\n".join(lines),
        "buttons": [],
        "custom": {
            "form_type": "health",
            "text": f"Datadog health metrics for {instance}",
            "objects": {
                "source":            "datadog",
                "resource_id":       instance,
                "resource_name":     instance,
                "db_type":           "POSTGRES",
                "start_ts":          start_ts,
                "end_ts":            end_ts,
                "timestamp":         datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "vitals":            vitals,
                "metrics_history":   history,
                "available_metrics": avail,
                "default_metrics":   defaults,
            },
        },
    }


async def _fetch_datadog_health(
    instance_id: Optional[str],
    start_ts: Optional[str] = None,
    end_ts: Optional[str] = None,
) -> Dict[str, Any]:
    """Fetch Datadog RDS health metrics using httpx (async, no external file needed).

    Returns vitals (avg per metric) + metrics_history (full timeseries)
    in the same shape as _fetch_health_metrics so _build_datadog_response
    can pass it straight to the frontend chart.

    When start_ts / end_ts are provided they are used as the query window;
    otherwise the last 15 minutes are used.
    """
    # Use mock data for local development or when DD credentials are not configured
    if USE_MOCK_DATA or (not os.environ.get("DD_API_KEY") or not os.environ.get("DD_APP_KEY")):
        logger.info("Using mock data for Datadog health (USE_MOCK_DATA=true or no DD credentials)")
        instance = (instance_id or DD_DEFAULT_INSTANCE).strip()
        now = datetime.now(timezone.utc)
        mock_start = start_ts or (now - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        mock_end = end_ts or now.strftime("%Y-%m-%dT%H:%M:%S.000Z")

        # Generate mock data in the format expected by _build_datadog_response
        import random
        time_points = []
        current = datetime.strptime(mock_start[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
        end_dt = datetime.strptime(mock_end[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
        while current <= end_dt:
            time_points.append(current.strftime("%Y-%m-%dT%H:%M:%S.000Z"))
            current += timedelta(minutes=5)

        dd_base_values = {
            "cpu_utilization_pct": 35.0,
            "freeable_memory_mb": 4096.0,
            "read_iops": 450.0,
            "write_iops": 280.0,
            "read_latency_ms": 5.2,
            "write_latency_ms": 8.7,
        }

        history = []
        vitals = {}
        for ts in time_points:
            row = {"ts": ts}
            for metric, base in dd_base_values.items():
                variation = base * random.uniform(-0.1, 0.1)
                value = max(0, base + variation)
                if metric == "cpu_utilization_pct":
                    value = min(100, value)
                value = round(value, 2)
                row[metric] = value
                vitals[metric] = value
            history.append(row)

        available_metrics = [
            {"metric": m[0], "unit": _DD_METRIC_UNITS.get(m[0], ""), "description": _DD_METRIC_DESC.get(m[0], "")}
            for m in _DD_METRICS
        ]

        return {
            "instance": instance,
            "from_ts": mock_start,
            "to_ts": mock_end,
            "vitals": vitals,
            "metrics_history": history,
            "available_metrics": available_metrics,
            "default_metrics": list(dd_base_values.keys()),
            "mock_data": True,
        }

    instance   = (instance_id or DD_DEFAULT_INSTANCE).strip()
    rds_filter = f"dbinstanceidentifier:{instance},region:{DD_DEFAULT_REGION}"

    now_ms = int(time.time() * 1000)
    if start_ts and end_ts:
        from_ms = int(
            datetime.strptime(start_ts[:19], "%Y-%m-%dT%H:%M:%S")
            .replace(tzinfo=timezone.utc)
            .timestamp() * 1000
        )
        to_ms = int(
            datetime.strptime(end_ts[:19], "%Y-%m-%dT%H:%M:%S")
            .replace(tzinfo=timezone.utc)
            .timestamp() * 1000
        )
    else:
        from_ms = now_ms - 15 * 60 * 1000
        to_ms   = now_ms

    def _ts_iso(ms: int) -> str:
        return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

    url  = f"{DD_BASE_URL}/api/v2/query/timeseries"
    hdrs = _dd_headers()

    vitals:  Dict[str, Any] = {}
    ts_map:  Dict[str, Any] = {}

    async def _fetch_dd_metric(display_key: str, agg: str, dd_metric: str, transform):
        """Fetch one Datadog metric with retry on transient errors."""
        if dd_metric.startswith("kubernetes"):
            query = f"sum:{dd_metric}{{*}}"
        else:
            query = f"{agg}:{dd_metric}{{{rds_filter}}}"

        body = {
            "data": {
                "type": "timeseries_request",
                "attributes": {
                    "from":    from_ms,
                    "to":      to_ms,
                    "queries": [{"name": "q1", "data_source": "metrics", "query": query}],
                },
            }
        }

        for attempt, backoff in enumerate([0.0] + _RETRY_BACKOFF[: _RETRY_ATTEMPTS - 1]):
            if backoff:
                await asyncio.sleep(backoff)
            try:
                async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
                    resp = await client.post(url, headers=hdrs, json=body)
                if resp.status_code != 200:
                    logger.warning(
                        "Datadog metric %s returned %s (attempt %d/%d)",
                        display_key, resp.status_code, attempt + 1, _RETRY_ATTEMPTS,
                    )
                    continue
                return display_key, transform, resp.json()
            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                logger.warning(
                    "Datadog metric %s transient error (attempt %d/%d): %s",
                    display_key, attempt + 1, _RETRY_ATTEMPTS, exc,
                )
                continue
            except Exception as exc:
                logger.warning("Datadog metric %s failed: %s", display_key, exc)
                return display_key, transform, None

        logger.error("Datadog metric %s exhausted retries", display_key)
        return display_key, transform, None

    # Fetch all metrics in parallel
    dd_results = await asyncio.gather(
        *[_fetch_dd_metric(dkey, agg, metric, transform) for dkey, agg, metric, transform in _DD_METRICS]
    )

    for display_key, transform, data in dd_results:
        if data is None:
            continue

        raw_vital = (
            _dd_extract_last(data)
            if display_key == "container_restarts"
            else _dd_extract_avg(data)
        )
        if raw_vital is not None:
            vitals[display_key] = transform(raw_vital) if transform else round(raw_vital, 4)

        try:
            times_list  = data["data"]["attributes"]["times"]
            values_list = data["data"]["attributes"]["values"][0]
            pointlist   = list(zip(times_list, values_list))
        except (KeyError, IndexError, TypeError):
            pointlist = []

        for ts_ms, raw_val in pointlist:
            if raw_val is None:
                continue
            val    = transform(raw_val) if transform else round(raw_val, 4)
            ts_str = _ts_iso(int(ts_ms))
            if ts_str not in ts_map:
                ts_map[ts_str] = {"ts": ts_str}
            ts_map[ts_str][display_key] = val

    metrics_history  = sorted(ts_map.values(), key=lambda r: r["ts"])
    available_metrics = [
        {
            "metric":      m[0],
            "unit":        _DD_METRIC_UNITS.get(m[0], ""),
            "description": _DD_METRIC_DESC.get(m[0], ""),
        }
        for m in _DD_METRICS
    ]

    return {
        "instance":          instance,
        "from_ts":           _ts_iso(from_ms),
        "to_ts":             _ts_iso(to_ms),
        "vitals":            vitals,
        "metrics_history":   metrics_history,
        "available_metrics": available_metrics,
        "default_metrics":   _DD_DEFAULT_METRICS,
    }


# ---------------------------------------------------------------------------
# Resource lookup helper
# ---------------------------------------------------------------------------


async def _lookup_resource_id(
    db_type: str,
    resource_name: str,
    sys_id: Optional[str],
    jwt_token: Optional[str],
) -> tuple[Optional[str], list]:
    """Resolve resource_id from resource_name and optional sys_id.

    Resource lists are cached for RESOURCES_CACHE_TTL seconds to avoid
    hammering the API on every follow-up turn.

    Returns (resource_id, candidates) where:
    - resource_id is set if a unique match was found (or best match after sys_id filter)
    - candidates is a non-empty list when disambiguation is needed
    """
    # Use mock data for local development
    if USE_MOCK_DATA:
        logger.info("Using mock data for resource lookup (USE_MOCK_DATA=true)")
        return await _mock_lookup_resource_id(db_type, resource_name, sys_id)

    key = db_type.upper()
    entry = _resources_cache.get(key)
    if entry and time.time() < entry["expires_at"]:
        all_resources = entry["resources"]
    else:
        try:
            data = await _client.get_resources(db_type, jwt_token)
            all_resources = data.get("data", {}).get("resources", [])
            _resources_cache[key] = {
                "resources": all_resources,
                "expires_at": time.time() + RESOURCES_CACHE_TTL,
            }
        except Exception as exc:
            logger.warning("Failed to fetch resources for %s: %s", db_type, exc)
            return None, []

    # Filter by resource_name (case-insensitive)
    name_matches = [
        r for r in all_resources
        if r.get("resource_name", "").lower() == resource_name.lower()
    ]

    if not name_matches:
        return None, []

    if sys_id:
        sys_matches = [
            r for r in name_matches
            if r.get("sys_id", "").upper() == sys_id.upper()
        ]
        # If sys_id filter yields results, use them; otherwise fall back to name_matches
        candidates = sys_matches if sys_matches else name_matches
    else:
        candidates = name_matches

    if len(candidates) == 1:
        return candidates[0]["resource_id"], []

    # Multiple candidates — check if all share the same sys_id
    sys_ids = {r.get("sys_id", "").upper() for r in candidates}
    if len(sys_ids) == 1:
        # Same sys_id, different resource_ids — just pick the first
        return candidates[0]["resource_id"], []

    # Different sys_ids — need disambiguation
    return None, candidates


# ---------------------------------------------------------------------------
# Fetch metrics helper
# ---------------------------------------------------------------------------


async def _fetch_health_metrics(
    resource_id: str,
    db_type: str,
    start_ts: str,
    end_ts: str,
    jwt_token: Optional[str],
) -> tuple[Dict[str, Any], list, List[Dict[str, Any]]]:
    """Fetch all metrics for a resource in parallel. Returns (vitals, history, catalog)."""

    # Fetch catalog (cached) to know which metrics are available
    catalog = await get_db_metrics_catalog(db_type, jwt_token)
    metric_names = [m["metric"] for m in catalog] if catalog else DEFAULT_METRICS

    # Semaphore limits concurrent API calls to avoid rate limiting
    semaphore = asyncio.Semaphore(10)

    async def _fetch_one(metric_name: str):
        async with semaphore:
            for attempt, backoff in enumerate([0.0] + _RETRY_BACKOFF[: _RETRY_ATTEMPTS - 1]):
                if backoff:
                    await asyncio.sleep(backoff)
                try:
                    result = await _client.get_metrics(
                        metric=metric_name,
                        resource_id=resource_id,
                        start_ts=start_ts,
                        end_ts=end_ts,
                        step="15m",
                        jwt_token=jwt_token,
                    )
                    data_points = result.get("data", {}).get("metrics", [])
                    return metric_name, data_points
                except (httpx.TimeoutException, httpx.ConnectError) as exc:
                    logger.warning(
                        "Metric %s transient error (attempt %d/%d): %s",
                        metric_name, attempt + 1, _RETRY_ATTEMPTS, exc,
                    )
                    continue
                except Exception as exc:
                    logger.warning("Metric %s failed: %s", metric_name, exc)
                    return metric_name, []
            logger.error("Metric %s exhausted retries", metric_name)
            return metric_name, []

    # Fetch all metrics in parallel (max 10 at a time)
    results = await asyncio.gather(*[_fetch_one(name) for name in metric_names])

    vitals: Dict[str, Any] = {}
    all_metric_rows: list = []

    for metric_name, metrics in results:
        if not metrics:
            continue
        all_metric_rows.extend(metrics)
        latest = max(metrics, key=lambda x: x.get("ts", ""))
        if latest.get("value") is not None:
            try:
                vitals[metric_name] = round(float(latest["value"]), 2)
            except (ValueError, TypeError):
                logger.warning("Metric %s has non-numeric value: %s", metric_name, latest["value"])

    # Build history keyed by timestamp — each row has {ts, metric_name: value, ...}
    ts_data: Dict[str, Any] = {}
    for m in all_metric_rows:
        ts = m.get("ts", "")
        if ts:
            if ts not in ts_data:
                ts_data[ts] = {"ts": ts}
            metric_name = m.get("metric", "")
            if metric_name:
                ts_data[ts][metric_name] = m.get("value")

    history = sorted(ts_data.values(), key=lambda x: x.get("ts", ""))

    return vitals, history, catalog


# ---------------------------------------------------------------------------
# Mock Data Generation for Local Development
# ---------------------------------------------------------------------------

MOCK_RESOURCES = {
    "POSTGRES": [
        {"resource_id": "res-pg-001", "resource_name": "aas_log_db", "sys_id": "SYSID-06903", "db_type": "POSTGRES"},
        {"resource_id": "res-pg-002", "resource_name": "ablnexus_db", "sys_id": "SYSID-06904", "db_type": "POSTGRES"},
        {"resource_id": "res-pg-003", "resource_name": "chatbot_db", "sys_id": "SYSID-06905", "db_type": "POSTGRES"},
        {"resource_id": "res-pg-004", "resource_name": "employee_db", "sys_id": "SYSID-06906", "db_type": "POSTGRES"},
    ],
    "ORACLE": [
        {"resource_id": "res-ora-001", "resource_name": "approval_engine_db", "sys_id": "SYSID-07001", "db_type": "ORACLE"},
        {"resource_id": "res-ora-002", "resource_name": "finance_db", "sys_id": "SYSID-07002", "db_type": "ORACLE"},
    ],
    "MYSQL": [
        {"resource_id": "res-mysql-001", "resource_name": "inventory_db", "sys_id": "SYSID-08001", "db_type": "MYSQL"},
        {"resource_id": "res-mysql-002", "resource_name": "orders_db", "sys_id": "SYSID-08002", "db_type": "MYSQL"},
    ],
    "MONGODB": [
        {"resource_id": "res-mongo-001", "resource_name": "logs_db", "sys_id": "SYSID-09001", "db_type": "MONGODB"},
        {"resource_id": "res-mongo-002", "resource_name": "analytics_db", "sys_id": "SYSID-09002", "db_type": "MONGODB"},
    ],
}

MOCK_METRICS_CATALOG = [
    {"metric": "cpu_utilization", "unit": "percentage", "description": "CPU utilization percentage"},
    {"metric": "disk_space_usage", "unit": "percentage", "description": "Disk space usage percentage"},
    {"metric": "freeable_memory", "unit": "MB", "description": "Freeable memory in megabytes"},
    {"metric": "number_of_active_connections", "unit": "count", "description": "Number of active database connections"},
    {"metric": "percentage_of_read_requests_served_by_the_buffer_cache", "unit": "percentage", "description": "Buffer cache hit ratio"},
    {"metric": "number_of_transactions_per_second", "unit": "count/s", "description": "Transaction throughput"},
    {"metric": "average_query_execution_time", "unit": "ms", "description": "Average query execution time"},
    {"metric": "number_of_deadlocks_detected", "unit": "count", "description": "Number of deadlocks detected"},
    {"metric": "replication_lag", "unit": "ms", "description": "Replication lag in milliseconds"},
    {"metric": "disk_read_latency", "unit": "ms", "description": "Average disk read latency"},
    {"metric": "disk_write_latency", "unit": "ms", "description": "Average disk write latency"},
    {"metric": "connection_errors", "unit": "count", "description": "Number of connection errors"},
]


def _generate_mock_metrics_history(
    resource_id: str,
    resource_name: str,
    db_type: str,
    start_ts: str,
    end_ts: str,
) -> tuple[Dict[str, Any], list, List[Dict[str, Any]]]:
    """Generate realistic mock metrics data for UI testing."""
    import random
    from datetime import datetime, timedelta, timezone

    # Parse timestamps
    try:
        start_dt = datetime.strptime(start_ts[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
        end_dt = datetime.strptime(end_ts[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
    except ValueError:
        start_dt = datetime.now(timezone.utc) - timedelta(hours=2)
        end_dt = datetime.now(timezone.utc)

    # Generate time points every 15 minutes
    time_points = []
    current = start_dt
    while current <= end_dt:
        time_points.append(current.strftime("%Y-%m-%dT%H:%M:%S.000Z"))
        current += timedelta(minutes=15)

    if not time_points:
        time_points = [end_dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")]

    # Base values with some variation
    base_values = {
        "cpu_utilization": 45.0,
        "disk_space_usage": 62.0,
        "freeable_memory": 2048.0,
        "number_of_active_connections": 85.0,
        "percentage_of_read_requests_served_by_the_buffer_cache": 94.5,
        "number_of_transactions_per_second": 1250.0,
        "average_query_execution_time": 45.0,
        "number_of_deadlocks_detected": 0.0,
        "replication_lag": 120.0,
        "disk_read_latency": 8.5,
        "disk_write_latency": 12.3,
        "connection_errors": 0.0,
    }

    # Generate history with realistic patterns
    history = []
    vitals = {}

    for ts in time_points:
        row = {"ts": ts}
        for metric, base in base_values.items():
            # Add some random variation (10-20% of base value)
            variation = base * random.uniform(-0.15, 0.15)
            value = max(0, base + variation)

            # Special handling for percentages (cap at 100)
            if "percentage" in metric or metric in ["cpu_utilization", "disk_space_usage"]:
                value = min(100, value)

            # Round appropriately
            if metric in ["number_of_deadlocks_detected", "connection_errors", "number_of_active_connections"]:
                value = int(round(value))
            else:
                value = round(value, 2)

            row[metric] = value

            # Store latest value for vitals
            vitals[metric] = value

        history.append(row)

    return vitals, history, MOCK_METRICS_CATALOG


async def _mock_lookup_resource_id(
    db_type: str,
    resource_name: str,
    sys_id: Optional[str],
) -> tuple[Optional[str], list]:
    """Mock resource lookup for local development."""
    resources = MOCK_RESOURCES.get(db_type.upper(), [])

    # Filter by resource_name
    name_matches = [r for r in resources if r["resource_name"].lower() == resource_name.lower()]

    if not name_matches:
        # If no exact match, return first resource as a fallback for demo
        if resources:
            return resources[0]["resource_id"], []
        return None, []

    if sys_id:
        sys_matches = [r for r in name_matches if r["sys_id"].upper() == sys_id.upper()]
        candidates = sys_matches if sys_matches else name_matches
    else:
        candidates = name_matches

    if len(candidates) == 1:
        return candidates[0]["resource_id"], []

    # Multiple candidates
    sys_ids = {r["sys_id"].upper() for r in candidates}
    if len(sys_ids) == 1:
        return candidates[0]["resource_id"], []

    return None, candidates


def _build_mock_metrics_response(
    resource_id: str,
    resource_name: str,
    db_type: str,
    start_ts: str,
    end_ts: str,
) -> Dict[str, Any]:
    """Build a mock metrics response for UI testing."""
    vitals, history, catalog = _generate_mock_metrics_history(
        resource_id, resource_name, db_type, start_ts, end_ts
    )

    display = f"{resource_name} (ID: {resource_id})" if resource_name else resource_id
    lines = [f"**Health Metrics for {display}** (Mock Data)\n"]
    lines.append(f"Database Type: **{db_type}**")
    lines.append(f"Time Range: {start_ts} to {end_ts}")

    available_metrics = [
        {"metric": m["metric"], "unit": m.get("unit", ""), "description": m.get("description", "")}
        for m in catalog
    ]

    return {
        "text": "\n".join(lines),
        "buttons": [],
        "custom": {
            "form_type": "health",
            "text": f"Health metrics for {display}",
            "objects": {
                "resource_id": resource_id,
                "resource_name": resource_name,
                "db_type": db_type,
                "start_ts": start_ts,
                "end_ts": end_ts,
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "vitals": vitals,
                "metrics_history": history,
                "available_metrics": available_metrics,
                "default_metrics": DEFAULT_METRICS,
                "mock_data": True,  # Flag to indicate this is mock data
            },
        },
    }


def _build_mock_datadog_response(
    instance: str,
    start_ts: str,
    end_ts: str,
) -> Dict[str, Any]:
    """Build a mock Datadog response for UI testing."""
    import random
    from datetime import datetime, timedelta, timezone

    # Parse timestamps
    try:
        start_dt = datetime.strptime(start_ts[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
        end_dt = datetime.strptime(end_ts[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
    except ValueError:
        start_dt = datetime.now(timezone.utc) - timedelta(hours=2)
        end_dt = datetime.now(timezone.utc)

    # Generate time points
    time_points = []
    current = start_dt
    while current <= end_dt:
        time_points.append(current.strftime("%Y-%m-%dT%H:%M:%S.000Z"))
        current += timedelta(minutes=5)

    if not time_points:
        time_points = [end_dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")]

    # Mock Datadog metrics
    dd_base_values = {
        "cpu_utilization_pct": 35.0,
        "freeable_memory_mb": 4096.0,
        "read_iops": 450.0,
        "write_iops": 280.0,
        "read_latency_ms": 5.2,
        "write_latency_ms": 8.7,
    }

    history = []
    vitals = {}

    for ts in time_points:
        row = {"ts": ts}
        for metric, base in dd_base_values.items():
            variation = base * random.uniform(-0.1, 0.1)
            value = max(0, base + variation)
            if metric == "cpu_utilization_pct":
                value = min(100, value)
            value = round(value, 2)
            row[metric] = value
            vitals[metric] = value
        history.append(row)

    available_metrics = [
        {"metric": m[0], "unit": _DD_METRIC_UNITS.get(m[0], ""), "description": _DD_METRIC_DESC.get(m[0], "")}
        for m in _DD_METRICS
    ]

    lines = [
        f"**Datadog Health Metrics** (Mock Data) — `{instance}`",
        f"Time Range: {start_ts} to {end_ts}",
    ]

    return {
        "text": "\n".join(lines),
        "buttons": [],
        "custom": {
            "form_type": "health",
            "text": f"Datadog health metrics for {instance}",
            "objects": {
                "source": "datadog",
                "resource_id": instance,
                "resource_name": instance,
                "db_type": "POSTGRES",
                "start_ts": start_ts,
                "end_ts": end_ts,
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "vitals": vitals,
                "metrics_history": history,
                "available_metrics": available_metrics,
                "default_metrics": list(dd_base_values.keys()),
                "mock_data": True,
            },
        },
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


async def process_health_request(
    message: str,
    conversation_id: str,
    auth_headers: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Process a health monitoring request.

    Multi-turn flow:
      1. Parse database type from message
      2. Ask for resource name + sys ID (if not provided)
      3. Resolve resource_id via GET /resources?db_type=...
      4. Ask for start timestamp (if not provided)
      5. Ask for end timestamp (if not provided)
      6. Fetch and return metrics

    State is stored per-conversation with a TTL so stale/abandoned
    sessions never corrupt future requests.
    """
    # Normalize message: collapse whitespace, expand common abbreviations
    normalized = re.sub(r'\s+', ' ', message.strip())
    normalized = re.sub(r'\bpg\b', 'postgres', normalized, flags=re.IGNORECASE)
    normalized = re.sub(r'\bpostgresql\b', 'postgres', normalized, flags=re.IGNORECASE)
    normalized = re.sub(r'\bperf\b', 'performance', normalized, flags=re.IGNORECASE)
    normalized = re.sub(r'\bconn(s)?\b', 'connections', normalized, flags=re.IGNORECASE)
    normalized = re.sub(r'\bstat(s)?\b', 'status', normalized, flags=re.IGNORECASE)
    normalized = re.sub(r'\bdd\b', 'datadog', normalized, flags=re.IGNORECASE)

    # Extract JWT token
    jwt_token = None
    if auth_headers:
        auth_header = auth_headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            jwt_token = auth_header[7:]

    db_type = _parse_db_type(normalized)
    resource_name = _parse_resource_name(normalized)
    sys_id = _parse_sys_id(normalized)
    start_ts, end_ts = _parse_timestamps(normalized)

    # -----------------------------------------------------------------
    # Follow-up path: user is responding to a previous question
    # -----------------------------------------------------------------
    state = _get_pending(conversation_id)
    if state:
        awaiting = state.get("awaiting")

        # --- Follow-up: user providing RDS instance for Datadog flow ---
        if awaiting == "datadog_instance":
            raw = normalized.strip()
            instance_id = None if raw.lower() == "default" else (_parse_rds_instance(raw) or raw or None)
            display_instance = instance_id or DD_DEFAULT_INSTANCE

            if start_ts and end_ts:
                _clear_pending(conversation_id)
                health = await _fetch_datadog_health(display_instance, start_ts, end_ts)
                return _build_datadog_response(health)

            _set_pending(conversation_id, awaiting="datadog_start_time", instance=display_instance)
            return _build_ask_datadog_start_time(display_instance)

        # --- Follow-up: user providing start time for Datadog flow ---
        if awaiting == "datadog_start_time":
            instance = state.get("instance", DD_DEFAULT_INSTANCE)

            if start_ts and end_ts:
                _clear_pending(conversation_id)
                health = await _fetch_datadog_health(instance, start_ts, end_ts)
                return _build_datadog_response(health)

            parsed_start = _parse_single_timestamp(normalized)
            if parsed_start:
                _set_pending(conversation_id, awaiting="datadog_end_time", instance=instance, start_ts=parsed_start)
                return _build_ask_datadog_end_time(instance, parsed_start)

            return _build_ask_datadog_start_time(instance)

        # --- Follow-up: user providing end time for Datadog flow ---
        if awaiting == "datadog_end_time":
            instance     = state.get("instance", DD_DEFAULT_INSTANCE)
            stored_start = state.get("start_ts")

            parsed_end = _parse_single_timestamp(normalized)
            if parsed_end:
                _clear_pending(conversation_id)
                health = await _fetch_datadog_health(instance, stored_start, parsed_end)
                return _build_datadog_response(health)

            return _build_ask_datadog_end_time(instance, stored_start)

        # --- Follow-up: user providing resource name (and optionally sys_id) ---
        if awaiting == "resource_name":
            db_type = state.get("db_type", db_type)
            parsed_name = resource_name or normalized.strip().split()[0]
            parsed_sys_id = sys_id

            resolved_id, candidates = await _lookup_resource_id(db_type, parsed_name, parsed_sys_id, jwt_token)

            if candidates:
                _set_pending(
                    conversation_id,
                    awaiting="sys_id",
                    db_type=db_type,
                    resource_name=parsed_name,
                    candidates=candidates,
                )
                return _build_ask_sys_id(db_type, parsed_name, candidates)

            if resolved_id:
                _set_pending(
                    conversation_id,
                    awaiting="start_time",
                    db_type=db_type,
                    resource_id=resolved_id,
                    resource_name=parsed_name,
                )
                return _build_ask_start_time(db_type, parsed_name, resolved_id)

            return _build_error(
                "Resource Not Found",
                f"No **{db_type}** resource named `{parsed_name}` was found. "
                "Please check the name and try again.",
            )

        # --- Follow-up: user providing sys_id for disambiguation ---
        if awaiting == "sys_id":
            db_type     = state.get("db_type", db_type)
            stored_name = state.get("resource_name", "")
            candidates  = state.get("candidates", [])

            resolved_sys = sys_id or message.strip().upper()
            matched = [r for r in candidates if r.get("sys_id", "").upper() == resolved_sys]

            if matched:
                resolved_id = matched[0]["resource_id"]
                _set_pending(
                    conversation_id,
                    awaiting="start_time",
                    db_type=db_type,
                    resource_id=resolved_id,
                    resource_name=stored_name,
                )
                return _build_ask_start_time(db_type, stored_name, resolved_id)

            return _build_ask_sys_id(db_type, stored_name, candidates)

        # --- Follow-up: user providing start time ---
        if awaiting == "start_time":
            db_type       = state.get("db_type", db_type)
            resource_id   = state.get("resource_id")
            resource_name = state.get("resource_name", "")

            if start_ts and end_ts:
                _clear_pending(conversation_id)
                return await _fetch_and_respond(resource_id, resource_name, db_type, start_ts, end_ts, jwt_token)

            parsed_start = _parse_single_timestamp(message)
            if parsed_start:
                _set_pending(
                    conversation_id,
                    awaiting="end_time",
                    db_type=db_type,
                    resource_id=resource_id,
                    resource_name=resource_name,
                    start_ts=parsed_start,
                )
                return _build_ask_end_time(db_type, resource_id, parsed_start, resource_name)

            return _build_ask_start_time(db_type, resource_name, resource_id)

        # --- Follow-up: user providing end time ---
        if awaiting == "end_time":
            db_type       = state.get("db_type", db_type)
            resource_id   = state.get("resource_id")
            resource_name = state.get("resource_name", "")
            start_ts      = state.get("start_ts")

            parsed_end = _parse_single_timestamp(message)
            if parsed_end:
                _clear_pending(conversation_id)
                return await _fetch_and_respond(resource_id, resource_name, db_type, start_ts, parsed_end, jwt_token)

            return _build_ask_end_time(db_type, resource_id, start_ts, resource_name)

    # -----------------------------------------------------------------
    # First message — determine what we have and what we still need
    # -----------------------------------------------------------------

    # --- Datadog flow: triggered when user explicitly mentions "datadog" ---
    if _is_datadog_request(message):
        instance_id = _parse_rds_instance(message)
        if instance_id:
            if start_ts and end_ts:
                health = await _fetch_datadog_health(instance_id, start_ts, end_ts)
                return _build_datadog_response(health)

            _set_pending(conversation_id, awaiting="datadog_start_time", instance=instance_id)
            return _build_ask_datadog_start_time(instance_id)

        _set_pending(conversation_id, awaiting="datadog_instance")
        return _build_ask_datadog_instance()

    if resource_name:
        resolved_id, candidates = await _lookup_resource_id(db_type, resource_name, sys_id, jwt_token)

        if candidates:
            _set_pending(
                conversation_id,
                awaiting="sys_id",
                db_type=db_type,
                resource_name=resource_name,
                candidates=candidates,
            )
            return _build_ask_sys_id(db_type, resource_name, candidates)

        if resolved_id:
            if start_ts and end_ts:
                return await _fetch_and_respond(resolved_id, resource_name, db_type, start_ts, end_ts, jwt_token)

            _set_pending(
                conversation_id,
                awaiting="start_time",
                db_type=db_type,
                resource_id=resolved_id,
                resource_name=resource_name,
            )
            return _build_ask_start_time(db_type, resource_name, resolved_id)

        return _build_error(
            "Resource Not Found",
            f"No **{db_type}** resource named `{resource_name}` was found. "
            "Please check the name and sys ID.",
        )

    # No resource name — ask for it
    _set_pending(conversation_id, awaiting="resource_name", db_type=db_type)
    return _build_ask_resource_name(db_type)


async def _fetch_and_respond(
    resource_id: str,
    resource_name: str,
    db_type: str,
    start_ts: str,
    end_ts: str,
    jwt_token: Optional[str],
) -> Dict[str, Any]:
    """Fetch metrics and return response — with an overall timeout guard."""
    # Use mock data for local development
    if USE_MOCK_DATA:
        logger.info("Using mock data for metrics response (USE_MOCK_DATA=true)")
        return _build_mock_metrics_response(resource_id, resource_name, db_type, start_ts, end_ts)

    try:
        vitals, history, catalog = await asyncio.wait_for(
            _fetch_health_metrics(resource_id, db_type, start_ts, end_ts, jwt_token),
            timeout=_FETCH_TIMEOUT,
        )

        return _build_metrics_response(
            resource_id=resource_id,
            resource_name=resource_name,
            db_type=db_type,
            start_ts=start_ts,
            end_ts=end_ts,
            vitals=vitals,
            metrics_history=history,
            catalog=catalog,
        )

    except httpx.HTTPStatusError as e:
        error_msg = ""
        try:
            error_msg = e.response.json().get("message", "")
        except Exception:
            error_msg = e.response.text[:100] if e.response.text else ""

        if e.response.status_code == 401:
            return _build_error("Authentication Error", "Invalid or expired token.")
        elif e.response.status_code == 404:
            return _build_error("Not Found", f"Resource '{resource_name or resource_id}' not found.")
        else:
            return _build_error("API Error", f"HTTP {e.response.status_code}: {error_msg}")

    except asyncio.TimeoutError:
        return _build_error(
            "Timeout",
            f"Metrics fetch timed out after {_FETCH_TIMEOUT}s. "
            "The API may be slow — please try a shorter time range.",
        )

    except httpx.TimeoutException:
        return _build_error("Timeout", "Request timed out. Please try again.")

    except httpx.RequestError:
        return _build_error("Connection Error", "Could not connect to the API.")

    except Exception as e:
        logger.exception("Unexpected error in _fetch_and_respond")
        return _build_error("Error", str(e))


# ---------------------------------------------------------------------------
# Quick test for parsing (run: python health_monitoring.py)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("PARSING TEST")
    print("=" * 60)

    test_messages = [
        # Complete: DB Type + Resource Name + Sys ID + Timestamp
        "Show postgres metrics for aas_log_db SYSID-06903 last 2 hours",
        "oracle health for approval_engine_db SYSID-06903 last 30 minutes",
        "mysql metrics for ablnexus_db SYSID-06903 last 1 day",

        # Missing timestamp (will ask)
        "postgres health for aas_log_db SYSID-06903",

        # Missing resource name (will ask)
        "I want postgres metrics",
        "show me oracle database health last 2 hours",

        # Just resource name (follow-up)
        "aas_log_db",
        "aas_log_db SYSID-06903",

        # Just sys_id (disambiguation follow-up)
        "SYSID-06903",

        # Just Timestamp (follow-up)
        "last 5 min",
        "last 3 hours",
    ]

    for msg in test_messages:
        db_type = _parse_db_type(msg)
        resource_name = _parse_resource_name(msg)
        sys_id = _parse_sys_id(msg)
        start_ts, end_ts = _parse_timestamps(msg)

        print(f"\nInput: \"{msg}\"")
        print(f"  db_type: {db_type}")
        print(f"  resource_name: {resource_name}")
        print(f"  sys_id: {sys_id}")
        print(f"  start_ts: {start_ts}")
        print(f"  end_ts: {end_ts}")

    print("\n" + "=" * 60)

