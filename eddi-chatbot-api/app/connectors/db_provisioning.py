"""Database Provisioning — multi-turn state machine.

Flow:
  1. User triggers provisioning intent  → ask to select PostgreSQL 15 or 16
  2. User picks a version               → ask for SYSID (format SYSID-XXXXX)
  3. User provides SYSID                → validate against ServiceNow, ask for database name (with rules)
  4. User provides a name               → show summary (version/sysid/name) and ask to confirm
  5. User confirms (yes)                → trigger Jenkins build via REST API
     User cancels (no)                  → abort

State is tracked per conversation_id so parallel sessions don't collide.

Required environment variables:
  JENKINS_URL             - Base URL, e.g. https://jenkins-entsvc-prod.corp.internal.citizensbank.com
  JENKINS_USER            - Jenkins username
  JENKINS_API_TOKEN       - Jenkins API token
  JENKINS_JOB_NAME        - Full job path, e.g. HNB/HNB-BUILD/eddi-hitl-db-provision/feature%2Fadd-jenkinsfile
  SERVICENOW_API_URL      - ServiceNow business app data endpoint
  SERVICENOW_API_AUTH     - Basic auth header value (Base64 encoded user:pass)
"""

import os
import re
import urllib3
from urllib.parse import quote

import requests

from typing import Any, Dict, Optional

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ---------------------------------------------------------------------------
# Per-conversation session state
# ---------------------------------------------------------------------------

_sessions: Dict[str, Dict[str, Any]] = {}

# Step constants
_STEP_SELECT_VERSION = "select_version"
_STEP_SYSID          = "sysid"
_STEP_DB_NAME        = "db_name"
_STEP_CONFIRM        = "confirm"

# ---------------------------------------------------------------------------
# Jenkins build trigger
# ---------------------------------------------------------------------------

def _job_path_to_url(base_url: str, job_name: str) -> str:
    """
    Convert a Jenkins job path to a full API URL.

    JENKINS_JOB_NAME uses '/' as a folder separator and '%2F' (pre-encoded)
    for slashes that are part of a branch name.

    Example:
      job_name = "HNB/HNB-BUILD/eddi-hitl-db-provision/feature%2Fadd-jenkinsfile"
      → <base>/job/HNB/job/HNB-BUILD/job/eddi-hitl-db-provision/job/feature%2Fadd-jenkinsfile
    """
    # Split only on literal '/' (folder boundaries).
    # Branch-name slashes must already be encoded as '%2F' in JENKINS_JOB_NAME.
    segments = job_name.strip("/").split("/")
    # Do NOT mark '%' as safe — let quote encode '%' to '%25' so that
    # '%2F' in branch names becomes '%252F', preventing requests/HTTP
    # from collapsing it into a real '/' path separator.
    encoded = "/job/".join(quote(s, safe="") for s in segments)
    return f"{base_url.rstrip('/')}/job/{encoded}"


def _trigger_jenkins(pg_version: str, db_name: str, sysid: str) -> Dict[str, Any]:
    """
    Trigger the Jenkins provisioning job via the REST API.

    Reads credentials and job name from environment variables.
    Passes PG_VERSION, DATABASE_NAME, and SYSID as build parameters.
    Returns a result dict with success flag and build details.
    """
    try:
        jenkins_url   = os.environ["JENKINS_URL"]
        jenkins_user  = os.environ["JENKINS_USER"]
        jenkins_token = os.environ["JENKINS_API_TOKEN"]
        job_name_tmpl = os.environ["JENKINS_JOB_NAME"]
    except KeyError as e:
        return {"success": False, "error": f"Missing environment variable: {e}"}

    # Replace {SYSID} placeholder with the actual SYSID for this request
    job_name  = job_name_tmpl.replace("{SYSID}", sysid)
    job_url   = _job_path_to_url(jenkins_url, job_name)
    build_url = f"{job_url}/buildWithParameters"

    params = {
        "PG_VERSION":    pg_version,  # e.g. "postgresql15" or "postgresql16"
        "DATABASE_NAME": db_name,
        "SYSID":         sysid,       # e.g. "SYSID-08825"
    }

    try:
        response = requests.post(
            build_url,
            params=params,
            auth=(jenkins_user, jenkins_token),
            verify=False,
            timeout=15,
        )
        response.raise_for_status()

        # Jenkins returns 201 and a Location header pointing to the queue item
        queue_url = response.headers.get("Location", "")
        return {
            "success":    True,
            "queue_url":  queue_url,
            "job_url":    job_url,
            "pg_version": pg_version,
            "db_name":    db_name,
            "sysid":      sysid,
        }
    except requests.exceptions.HTTPError as e:
        return {"success": False, "error": f"Jenkins HTTP {e.response.status_code}: {e.response.text[:200]}"}
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": str(e)}


# ---------------------------------------------------------------------------
# SYSID validators
# ---------------------------------------------------------------------------

_SYSID_PATTERN = re.compile(r"^SYSID-\d+$", re.IGNORECASE)


def _validate_sysid_format(value: str) -> Optional[str]:
    """Return an error message if *value* is not a valid SYSID format, or None if fine."""
    if not value:
        return "SYSID cannot be empty."
    if not _SYSID_PATTERN.match(value):
        return "SYSID must follow the format **SYSID-XXXXX** (e.g. `SYSID-08825`)."
    return None


def _validate_sysid_snow(sysid: str) -> Dict[str, Any]:
    """
    Call ServiceNow Business App API to validate a SYSID.

    Returns a dict with:
      success (bool)  - False on network/API error
      valid   (bool)  - False if SYSID not found
      active  (bool)  - whether the application is active
      name    (str)   - application name from ServiceNow
      error   (str)   - human-readable error (only when success=False or valid=False)
    """
    snow_url  = os.environ.get("SERVICENOW_API_URL")
    snow_auth = os.environ.get("SERVICENOW_API_AUTH")

    url     = f"{snow_url}/{sysid}"
    headers = {"Authorization": snow_auth}

    try:
        response = requests.get(url, headers=headers, timeout=10, verify=False)

        if response.status_code == 404:
            return {"success": True, "valid": False, "error": f"SYSID `{sysid}` was not found in ServiceNow."}

        if response.status_code != 200:
            return {"success": False, "valid": False, "error": f"ServiceNow API returned HTTP {response.status_code}."}

        result = response.json().get("result", {})
        name              = result.get("Name", "")
        business_app_tag  = result.get("Business Application Tag", "")
        system_id         = result.get("System Id", "")
        description       = result.get("Description", "")
        active            = result.get("Active", "").lower() == "true"

        return {
            "success": True,
            "valid": True,
            "active": active,
            "name": name,
            "business_app_tag": business_app_tag,
            "system_id": system_id,
            "description": description,
        }

    except requests.exceptions.Timeout:
        return {"success": False, "valid": False, "error": "ServiceNow API timed out. Please try again."}
    except requests.exceptions.RequestException as e:
        return {"success": False, "valid": False, "error": f"ServiceNow API error: {e}"}


# ---------------------------------------------------------------------------
# DB name validator
# ---------------------------------------------------------------------------

_DB_NAME_PATTERN = re.compile(r"^[a-z][a-z0-9_]{0,62}$")


def _validate_db_name(name: str) -> Optional[str]:
    """Return an error message if *name* is invalid, or None if it's fine."""
    if not name:
        return "Database name cannot be empty."
    if not _DB_NAME_PATTERN.match(name):
        if not name[0].isalpha():
            return "Database name must **start with a letter** (a–z)."
        if len(name) > 63:
            return f"Database name must be **63 characters or fewer** (yours is {len(name)})."
        return (
            "Database name may only contain **lowercase letters**, **digits**, "
            "and **underscores** — no spaces or special characters."
        )
    return None


# ---------------------------------------------------------------------------
# Version parser
# ---------------------------------------------------------------------------

def _parse_version(text: str) -> Optional[str]:
    """Extract 'postgresql15' or 'postgresql16' from user text, or None."""
    t = text.lower().replace(" ", "").replace("-", "")
    if any(x in t for x in ("pg16", "postgresql16", "postgres16", "16")):
        return "postgresql16"
    if any(x in t for x in ("pg15", "postgresql15", "postgres15", "15")):
        return "postgresql15"
    return None


# ---------------------------------------------------------------------------
# Greeting / intro message
# ---------------------------------------------------------------------------

def _intro_message() -> str:
    return (
        "## Database Provisioning\n\n"
        "I'll walk you through provisioning a new PostgreSQL database.\n\n"
        "**Select PostgreSQL version:**\n\n"
        "Which version would you like to provision?\n\n"
        "- **PostgreSQL 15** — Stable, widely supported, recommended for most workloads\n"
        "- **PostgreSQL 16** — Latest release with improved performance and logical replication\n\n"
        "Reply with **15** or **16** (or the full name, e.g. *PostgreSQL 16*)."
    )


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def process_user_input(message: str, conversation_id: str) -> str:
    """
    Drive the provisioning state machine for *conversation_id*.

    Parameters
    ----------
    message         : latest user message
    conversation_id : unique ID for this chat session

    Returns
    -------
    str : next chatbot message
    """
    text = message.strip()
    t    = text.lower()

    # Hard-stop keywords — let the user escape at any point
    if t in {"cancel", "abort", "stop", "quit", "exit", "never mind", "nevermind"}:
        _sessions.pop(conversation_id, None)
        return "Database provisioning cancelled. Is there anything else I can help you with?"

    session = _sessions.get(conversation_id)

    # ------------------------------------------------------------------ #
    # No active session → start fresh
    # ------------------------------------------------------------------ #
    if session is None:
        _sessions[conversation_id] = {"step": _STEP_SELECT_VERSION}
        return _intro_message()

    step = session.get("step")

    # ------------------------------------------------------------------ #
    # Step 1 — waiting for version selection
    # ------------------------------------------------------------------ #
    if step == _STEP_SELECT_VERSION:
        version = _parse_version(t)
        if version is None:
            return (
                "I didn't catch that. Please reply with **15** or **16** to select your "
                "PostgreSQL version, or type **cancel** to abort."
            )
        session["pg_version"] = version
        session["step"] = _STEP_SYSID
        version_label = "PostgreSQL 15" if version == "postgresql15" else "PostgreSQL 16"
        return (
            f"Got it — **{version_label}** selected.\n\n"
            "**SYSID:**\n\n"
            "Please provide the SYSID for this database request.\n\n"
            "Format: `SYSID-XXXXX` (e.g. `SYSID-08825`)"
        )

    # ------------------------------------------------------------------ #
    # Step 2 — waiting for SYSID
    # ------------------------------------------------------------------ #
    if step == _STEP_SYSID:
        candidate = text.split()[0] if text.split() else ""

        # 1. Format check (fast, local)
        fmt_error = _validate_sysid_format(candidate)
        if fmt_error:
            return (
                f"**Invalid SYSID:** {fmt_error}\n\n"
                "Please enter a valid SYSID or type **cancel** to abort."
            )

        sysid_upper = candidate.upper()

        # 2. ServiceNow API validation
        snow = _validate_sysid_snow(sysid_upper)

        if not snow["success"]:
            return (
                f"**ServiceNow Validation Error**\n\n"
                f"{snow['error']}\n\n"
                "Please try again or type **cancel** to abort."
            )

        if not snow["valid"]:
            return (
                f"**SYSID Not Found**\n\n"
                f"SYSID `{sysid_upper}` does not exist in ServiceNow. "
                "Please check the value and try again, or type **cancel** to abort."
            )

        if not snow["active"]:
            return (
                f"**SYSID is Inactive**\n\n"
                f"The application **{snow['name']}** (`{sysid_upper}`) is marked as **Inactive** "
                "in ServiceNow. Please provide an active SYSID or type **cancel** to abort."
            )

        # 3. All good — store and show validation card
        session["sysid"]            = sysid_upper
        session["sysid_name"]       = snow["name"]
        session["business_app_tag"] = snow["business_app_tag"]
        session["system_id"]        = snow["system_id"]
        session["description"]      = snow["description"]
        session["step"]             = _STEP_DB_NAME

        return (
            "**SYSID Validated**\n\n"
            "```\n"
            f"  SYSID                    : {sysid_upper}\n"
            f"  Name                     : {snow['name']}\n"
            f"  Business Application Tag : {snow['business_app_tag']}\n"
            f"  System Id                : {snow['system_id']}\n"
            f"  Description              : {snow['description']}\n"
            f"  Active                   : {'Yes' if snow['active'] else 'No'}\n"
            "```\n\n"
            "**Database name:**\n\n"
            "Please provide a name for your new database. Rules:\n\n"
            "- Must **start with a lowercase letter** (a–z)\n"
            "- May contain **lowercase letters**, **digits (0–9)**, and **underscores (_)**\n"
            "- **No spaces**, hyphens, or special characters\n"
            "- Maximum **63 characters**\n\n"
            "Example: `payments_db`, `analytics_store`, `orders2024`"
        )

    # ------------------------------------------------------------------ #
    # Step 3 — waiting for database name
    # ------------------------------------------------------------------ #
    if step == _STEP_DB_NAME:
        # Take the first whitespace-free token as the intended name
        candidate = text.split()[0] if text.split() else ""
        error = _validate_db_name(candidate)
        if error:
            return (
                f"**Invalid database name:** {error}\n\n"
                "Please enter a valid name or type **cancel** to abort."
            )
        session["db_name"] = candidate
        session["step"] = _STEP_CONFIRM
        version_label = "PostgreSQL 15" if session["pg_version"] == "postgresql15" else "PostgreSQL 16"
        jenkins_url   = os.environ.get("JENKINS_URL", "https://jenkins-entsvc-prod.corp.internal.citizensbank.com")
        job_name_tmpl = os.environ.get("JENKINS_JOB_NAME")
        job_name      = job_name_tmpl.replace("{SYSID}", session["sysid"])
        job_url       = _job_path_to_url(jenkins_url, job_name)
        return (
            "**Confirm provisioning:**\n\n"
            "Please review the details below before we kick off the Jenkins build.\n\n"
            "```\n"
            f"  Database version   : {version_label}\n"
            f"  Database name      : {candidate}\n"
            f"  SYSID              : {session['sysid']}\n"
            "```\n\n"
            "Shall I proceed and trigger the Jenkins build? Reply **yes** to confirm or **no** to cancel."
        )

    # ------------------------------------------------------------------ #
    # Step 4 — waiting for confirmation
    # ------------------------------------------------------------------ #
    if step == _STEP_CONFIRM:
        if t in {"yes", "y", "confirm", "go ahead", "proceed", "ok", "sure", "yep", "yup"}:
            result = _trigger_jenkins(
                session["pg_version"],
                session["db_name"],
                session["sysid"],
            )
            _sessions.pop(conversation_id, None)
            return _format_jenkins_response(result)

        if t in {"no", "n", "no thanks", "nope", "cancel", "abort"}:
            _sessions.pop(conversation_id, None)
            return "Database provisioning cancelled. No changes were made. Is there anything else I can help you with?"

        return "Please reply **yes** to confirm or **no** to cancel the provisioning request."

    # Fallback — shouldn't happen, but reset gracefully
    _sessions.pop(conversation_id, None)
    return _intro_message()


# ---------------------------------------------------------------------------
# Response formatter
# ---------------------------------------------------------------------------

def _format_jenkins_response(result: Dict[str, Any]) -> str:
    if not result.get("success"):
        return (
            "**Provisioning request could not be submitted.**\n\n"
            "Something went wrong on our end. "
            "Please try again or contact the DBA team at dl-edsdelivery@citizensbank.com."
        )

    version_label = (
        "PostgreSQL 15" if result["pg_version"] == "postgresql15" else "PostgreSQL 16"
    )
    return (
        "**Database Provisioning Request Submitted!**\n\n"
        "Your request has been submitted and is pending approval.\n\n"
        "```\n"
        f"  Database version : {version_label}\n"
        f"  Database name    : {result['db_name']}\n"
        f"  SYSID            : {result['sysid']}\n"
        "```\n\n"
        "**What happens next:**\n\n"
        "1. An approval email will be sent to the DBA team\n"
        "2. Once approved, the database will be created automatically\n"
        "3. You will receive an email with the connection details\n\n"
        "Is there anything else I can help you with?"
    )


# ---------------------------------------------------------------------------
# Quick smoke-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Happy path
    cid = "test-conv-001"
    for msg in ["I want to provision a database", "16", "SYSID-08825", "payments_service_db", "yes"]:
        print(f"\nUser : {msg}")
        print(f"Bot  : {process_user_input(msg, cid)}")
        print("-" * 60)

    # Cancel mid-flow
    cid2 = "test-conv-002"
    for msg in ["create database", "postgresql15", "SYSID-00001", "cancel"]:
        print(f"\nUser : {msg}")
        print(f"Bot  : {process_user_input(msg, cid2)}")
        print("-" * 60)

    # Invalid SYSID then invalid DB name
    cid3 = "test-conv-003"
    for msg in ["provision db", "15", "bad-sysid", "SYSID-99999", "123bad", "good_name_db", "yes"]:
        print(f"\nUser : {msg}")
        print(f"Bot  : {process_user_input(msg, cid3)}")
        print("-" * 60)
