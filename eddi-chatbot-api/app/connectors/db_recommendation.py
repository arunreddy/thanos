"""DatabaseRecommendationChatbot with real Jira integration"""

import json
import os
import re
from typing import Dict, Any, Optional

import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ---------------------------------------------------------------------------
# Jira configuration
# ---------------------------------------------------------------------------

JIRA_URL = os.environ.get("EDDI_JIRA_BASE_URL", "https://citizensbank-sandbox.atlassian.net")
JIRA_USER = os.environ.get("EDDI_JIRA_USER", "")
JIRA_API_TOKEN = os.environ.get("EDDI_JIRA_API_TOKEN", "")


# ---------------------------------------------------------------------------
# Mocked back-end responses (mirror functions.py logic without real calls)
# ---------------------------------------------------------------------------

_MOCK_RECOMMENDATIONS: Dict[str, Dict[str, Any]] = {
    "postgresql_acid_opensource":   {"recommendation": "PostgreSQL",   "reason": "Open-source app without Microsoft dependencies",          "status": "success"},
    "postgresql_acid_proprietary":  {"recommendation": "PostgreSQL",   "reason": "Proprietary app without Microsoft dependencies",          "status": "success"},
    "postgresql_large_db":          {"recommendation": "PostgreSQL",   "reason": "Large database (>300 GB) without ACID requirements",      "status": "success"},
    "mssql_acid_opensource":        {"recommendation": "MS SQL Server", "reason": "Open-source app with Microsoft dependencies",            "status": "success"},
    "mssql_acid_proprietary":       {"recommendation": "MS SQL Server", "reason": "Proprietary app with Microsoft dependencies",            "status": "success"},
    "mysql_small_db":               {"recommendation": "MySQL",         "reason": "Small database (<300 GB) without ACID requirements",     "status": "success"},
    "analytics":                    {"recommendation": "Feature under development", "reason": "Analytics support coming soon",             "status": "not_supported"},
    "unstructured":                 {"recommendation": "Feature under development", "reason": "Unstructured data support coming soon",      "status": "not_supported"},
    "vendor":                       {"recommendation": "Contact DBA Team", "reason": "Vendor apps require specialised review",
                                     "email": "dl-edsdelivery@citizensbank.com",                                                           "status": "dba_review"},
}

# ---------------------------------------------------------------------------
# State: store the last recommendation so "yes" can reference it
# ---------------------------------------------------------------------------

_last_recommendation: Dict[str, Any] = {}


# ---------------------------------------------------------------------------
# Jira ticket creation
# ---------------------------------------------------------------------------

def create_jira_ticket(project_key: str, summary: str, description: str = "",
                       issue_type: str = "Story") -> Dict[str, Any]:
    """Create a real Jira ticket via the REST API."""
    url = f"{JIRA_URL}/rest/api/2/issue"
    auth = (JIRA_USER, JIRA_API_TOKEN)
    headers = {"content-type": "application/json"}
    payload = json.dumps({
        "fields": {
            "project": {"key": project_key},
            "summary": summary,
            "description": description,
            "issuetype": {"name": issue_type},
        }
    })

    try:
        response = requests.post(url, headers=headers, data=payload,
                                 auth=auth, verify=False, timeout=30)
    except requests.RequestException as exc:
        return {"success": False, "error": str(exc)}

    if response.status_code != 201:
        error_detail = response.text
        try:
            error_detail = response.json().get("errors", error_detail)
        except ValueError:
            pass
        return {"success": False, "error": f"HTTP {response.status_code}: {error_detail}"}

    data = response.json()
    ticket_key = data.get("key", "")
    return {
        "success": True,
        "ticket_id": ticket_key,
        "jira_link": f"{JIRA_URL}/browse/{ticket_key}",
        "error": None,
    }


# ---------------------------------------------------------------------------
# Business info extractor
# ---------------------------------------------------------------------------

def _extract_business_info(text: str) -> Dict[str, Optional[str]]:
    """Extract architect name, architecture review status, epic ID, and SYSID from text."""
    info: Dict[str, Optional[str]] = {
        "architect_name": None,
        "arch_review": None,
        "epic_id": None,
        "sysid": None,
    }

    # Architect name — "my name is John Smith", "architect: John Smith",
    #                  "architect is John Smith", "architect name John Smith"
    name_match = re.search(
        r"(?:my name is|i am|architect(?:\s+name)?\s+is|architect(?:\s+name)?[\s:]+)\s*([^,()\n]+)",
        text, re.IGNORECASE
    )
    if name_match:
        info["architect_name"] = name_match.group(1).strip().rstrip(",")

    # Architecture review — "arch review yes/no", "architecture review: yes",
    #                        "completed an Architecture Review" → Yes
    review_match = re.search(
        r"arch(?:itecture)?\s+review[\s:]+?(yes|no)\b",
        text, re.IGNORECASE
    )
    if review_match:
        info["arch_review"] = review_match.group(1).capitalize()
    elif re.search(r"completed\s+(?:an?\s+)?arch(?:itecture)?\s+review", text, re.IGNORECASE):
        info["arch_review"] = "Yes"

    # Epic / Initiative ID — "epic EPIC-123", "(EPIC-2024)", "initiative INI-456"
    epic_match = re.search(
        r"(?:(?:epic|initiative)[\s:(]+([A-Z0-9][-A-Z0-9]+)|\(([A-Z]+-\d+)\))",
        text, re.IGNORECASE
    )
    if epic_match:
        info["epic_id"] = (epic_match.group(1) or epic_match.group(2)).upper()

    # SYSID — "SYSID-12345" (standalone), "sysid: SYS-001", "business mapping BM-99"
    sysid_match = re.search(r"\bSYSID-\w+\b", text, re.IGNORECASE)
    if sysid_match:
        info["sysid"] = sysid_match.group(0).upper()
    else:
        sysid_match = re.search(
            r"(?:sysid|sys id|business mapping)[\s:]+([A-Z0-9][-A-Z0-9]+)",
            text, re.IGNORECASE
        )
        if sysid_match:
            info["sysid"] = sysid_match.group(1).upper()

    return info


# ---------------------------------------------------------------------------
# Simple keyword classifier
# ---------------------------------------------------------------------------

def _classify(text: str) -> str:
    """Return a recommendation key based on keywords found in *text*."""
    t = text.lower()

    # Helpers: detect negated vs affirmed keywords
    def _negated(keyword: str) -> bool:
        """Return True if *keyword* is negated nearby (within ~6 words)."""
        # Direct adjacency: "no microsoft", "without microsoft"
        direct = rf"\b(no|not|without|non)\s+{re.escape(keyword)}"
        if re.search(direct, t):
            return True
        # Indirect: "do not have ... microsoft licensing" (up to 6 words gap)
        indirect = rf"\b(do not|don't|does not|doesn't|have no|without)\b[\w\s]{{0,40}}{re.escape(keyword)}"
        if re.search(indirect, t):
            return True
        return False

    def _affirmed(keyword: str) -> bool:
        return keyword in t and not _negated(keyword)

    # Data-nature shortcuts
    if "analytics" in t:
        return "analytics"
    if "unstructured" in t:
        return "unstructured"
    if "vendor" in t:
        return "vendor"

    # Explicit DB name hints (direct shortcut for testing)
    if "mysql" in t:
        return "mysql_small_db"
    ms_keywords = ["ms sql", "mssql", "sql server", "microsoft"]
    has_ms = any(_affirmed(kw) for kw in ms_keywords)
    if has_ms:
        open_src = _affirmed("open source") or _affirmed("opensource")
        return "mssql_acid_opensource" if open_src else "mssql_acid_proprietary"
    if "postgresql" in t or "postgres" in t:
        if "large" in t or ">300" in t or "big" in t:
            return "postgresql_large_db"
        return "postgresql_acid_opensource"

    # ACID / size decision path
    acid_no  = _negated("acid") or "no acid" in t or "acid no" in t or re.search(r"acid\s*[=:]\s*no", t) is not None
    acid_yes = re.search(r"\bacid\b", t) and not acid_no

    if acid_yes:
        open_src = _affirmed("open source") or _affirmed("opensource")
        ms_dep   = _affirmed("microsoft") or _affirmed("ms licensing")
        if ms_dep:
            return "mssql_acid_opensource" if open_src else "mssql_acid_proprietary"
        return "postgresql_acid_opensource" if open_src else "postgresql_acid_proprietary"

    if acid_no:
        if "large" in t or ">300" in t or "big" in t:
            return "postgresql_large_db"
        if "small" in t or "<300" in t:
            return "mysql_small_db"

    if "large" in t or ">300" in t:
        return "postgresql_large_db"
    if "small" in t or "<300" in t:
        return "mysql_small_db"

    # Default: not enough info yet
    return "unknown"


# ---------------------------------------------------------------------------
# Public API – single str input, returns str
# ---------------------------------------------------------------------------

def process_user_input(user_message: str) -> str:
    """
    Mock entry point for the DatabaseRecommendationChatbot.

    Accepts a plain-text *user_message* string and returns a fully-formatted
    chatbot response string with a mocked database recommendation (and a
    mocked Jira ticket when the user confirms).

    Parameters
    ----------
    user_message : str
        Any natural-language request, e.g.
        ``"I need a transactional PostgreSQL DB, no ACID needed, small size"``

    Returns
    -------
    str
        Formatted chatbot response.

    Examples
    --------
    >>> print(process_user_input("transactional, structured, CFG developed, ACID yes, open source, no microsoft"))
    >>> print(process_user_input("analytics use case"))
    >>> print(process_user_input("yes"))   # confirm Jira ticket creation
    """
    if not isinstance(user_message, str):
        raise TypeError(f"user_message must be str, got {type(user_message).__name__}")

    t = user_message.strip().lower()

    # ---- Jira-ticket confirmation ----------------------------------------
    if t in {"yes", "y", "create ticket", "yes please", "create jira", "create jira ticket"}:
        description = _build_jira_description(
            _last_recommendation.get("rec", {}),
            _last_recommendation.get("business_info", {}),
            _last_recommendation.get("rec_key", ""),
        )
        ticket = create_jira_ticket(
            project_key="EDE",
            summary="Database choice analysis",
            description=description,
            issue_type="Story",
        )
        return _format_jira_response(ticket)

    # ---- Ticket decline -----------------------------------------------------
    if t in {"no", "n", "no thanks", "skip", "no ticket"}:
        return "Understood. No ticket will be created. Is there anything else I can help you with?"

    # ---- Reset / start-over -------------------------------------------------
    if t in {"start over", "reset", "begin again", "restart"}:
        return "Sure, let's start fresh. What would you like help with?"

    # ---- Classify and respond -----------------------------------------------
    key = _classify(user_message)
    business_info = _extract_business_info(user_message)

    if key == "unknown":
        return _format_clarification_response(user_message)

    rec = _MOCK_RECOMMENDATIONS[key]

    # Store context so a subsequent "yes" can build the full Jira description
    _last_recommendation.clear()
    _last_recommendation.update({
        "rec": rec,
        "business_info": business_info,
        "rec_key": key,
    })

    return _format_recommendation_response(rec, business_info, rec_key=key)


# ---------------------------------------------------------------------------
# Tech info inference from recommendation key
# ---------------------------------------------------------------------------

_TECH_INFO_BY_KEY: Dict[str, Dict[str, str]] = {
    "postgresql_acid_opensource":  {"data_nature": "Transactional", "data_structure": "Structured", "app_type": "CFG Developed", "acid_compliance": "Yes", "is_open_source": "Yes",  "ms_licensing": "No",  "vendor_recommended_db": "N/A"},
    "postgresql_acid_proprietary": {"data_nature": "Transactional", "data_structure": "Structured", "app_type": "CFG Developed", "acid_compliance": "Yes", "is_open_source": "No",   "ms_licensing": "No",  "vendor_recommended_db": "N/A"},
    "postgresql_large_db":         {"data_nature": "Transactional", "data_structure": "Structured", "app_type": "CFG Developed", "acid_compliance": "No",  "is_open_source": "N/A",  "ms_licensing": "N/A", "vendor_recommended_db": "N/A"},
    "mssql_acid_opensource":       {"data_nature": "Transactional", "data_structure": "Structured", "app_type": "CFG Developed", "acid_compliance": "Yes", "is_open_source": "Yes",  "ms_licensing": "Yes", "vendor_recommended_db": "N/A"},
    "mssql_acid_proprietary":      {"data_nature": "Transactional", "data_structure": "Structured", "app_type": "CFG Developed", "acid_compliance": "Yes", "is_open_source": "No",   "ms_licensing": "Yes", "vendor_recommended_db": "N/A"},
    "mysql_small_db":              {"data_nature": "Transactional", "data_structure": "Structured", "app_type": "CFG Developed", "acid_compliance": "No",  "is_open_source": "N/A",  "ms_licensing": "N/A", "vendor_recommended_db": "N/A"},
    "analytics":                   {"data_nature": "Analytics",     "data_structure": "N/A",        "app_type": "N/A",           "acid_compliance": "N/A", "is_open_source": "N/A",  "ms_licensing": "N/A", "vendor_recommended_db": "N/A"},
    "unstructured":                {"data_nature": "Transactional", "data_structure": "Unstructured","app_type": "N/A",           "acid_compliance": "N/A", "is_open_source": "N/A",  "ms_licensing": "N/A", "vendor_recommended_db": "N/A"},
    "vendor":                      {"data_nature": "Transactional", "data_structure": "Structured", "app_type": "Vendor Application", "acid_compliance": "N/A", "is_open_source": "N/A", "ms_licensing": "N/A", "vendor_recommended_db": "Yes"},
}


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

def _build_jira_description(rec: Dict[str, Any], info: Dict[str, Optional[str]], rec_key: str) -> str:
    """Build the full description text used in both the preview and the real Jira ticket."""
    tech = _TECH_INFO_BY_KEY.get(rec_key, {})
    biz  = info or {}

    return (
        "Database choice analysis for the application\n\n"
        "Application Information:\n"
        f"  1. Application Architect/Owner: {biz.get('architect_name') or 'N/A'}\n"
        f"  2. Architecture Review Status: {biz.get('arch_review') or 'N/A'}\n"
        f"  3. Epic/Initiative Link: {biz.get('epic_id') or 'N/A'}\n"
        f"  4. SYSID/Business Mapping Available: {biz.get('sysid') or 'N/A'}\n\n"
        "Technical Requirements:\n"
        f"  1. What is the nature of data you intend to store? {tech.get('data_nature', 'N/A')}\n"
        f"  2. How do you define your data? {tech.get('data_structure', 'N/A')}\n"
        f"  3. Is it a Vendor Application (COTS) or CFG developed? {tech.get('app_type', 'N/A')}\n"
        f"  4. Does your application need strict ACID SQL Compliance? {tech.get('acid_compliance', 'N/A')}\n"
        f"  5. Is your Application Open source? {tech.get('is_open_source', 'N/A')}\n"
        f"  6. Does your Application have Microsoft licensing dependency? {tech.get('ms_licensing', 'N/A')}\n"
        f"  7. Does Vendor recommend any Database types? {tech.get('vendor_recommended_db', 'N/A')}\n\n"
        f"Recommendation:\n"
        f"  {rec.get('recommendation', 'N/A')}"
    )


def _format_jira_preview(rec: Dict[str, Any], info: Dict[str, Optional[str]], rec_key: str) -> str:
    """Build the Jira ticket preview shown before asking the user to confirm."""
    description = _build_jira_description(rec, info, rec_key)

    return (
        "**Jira Ticket Preview:**\n"
        "```\n"
        f"Summary: Database choice analysis\n"
        f"Description:\n{description}\n"
        "```"
    )


def _format_recommendation_response(rec: Dict[str, Any], info: Dict[str, Optional[str]] = None, rec_key: str = "") -> str:
    status  = rec.get("status", "")
    preview = _format_jira_preview(rec, info or {}, rec_key)

    if status == "not_supported":
        return (
            "## Database Recommendation\n\n"
            f"**Result:** {rec['recommendation']}\n\n"
            f"**Details:** {rec['reason']}\n\n"
            f"{preview}\n\n"
            "Would you like me to create a Jira ticket for this recommendation? [Yes] / [No]"
        )

    if status == "dba_review":
        return (
            "## Database Recommendation\n\n"
            f"**Result:** {rec['recommendation']}\n\n"
            f"**Reason:** {rec['reason']}\n\n"
            f"Please reach out to the DBA team at **{rec.get('email', 'dl-edsdelivery@citizensbank.com')}**.\n\n"
            f"{preview}\n\n"
            "Would you like me to create a Jira ticket for this recommendation? [Yes] / [No]"
        )

    # success
    return (
        "## Database Recommendation\n\n"
        f"Based on your requirements, we recommend: **{rec['recommendation']}**\n\n"
        f"**Justification:** {rec['reason']}\n\n"
        f"{preview}\n\n"
        "Would you like me to create a Jira ticket for this recommendation? [Yes] / [No]"
    )


def _format_jira_response(ticket: Dict[str, Any]) -> str:
    if not ticket.get("success"):
        return f"❌ Jira Error: {ticket.get('error', 'Unknown error')}"

    return (
        "✅ Jira Ticket Created!\n\n"
        f"**Ticket ID:** {ticket['ticket_id']}\n"
        f"**Link:** {ticket['jira_link']}"
    )


def _format_clarification_response(user_message: str) -> str:
    return (
        "Thanks for your request! To generate a recommendation I need a few details:\n\n"
        "1. **Data Nature** – Is this *Transactional* or *Analytics*?\n"
        "2. **Data Structure** – Is the data *Structured* or *Unstructured*?\n"
        "3. **Application Type** – *Vendor Application* or *CFG Developed*?\n"
        "4. **ACID Compliance** – Required? *Yes* / *No*\n"
        "   - If Yes → Is it *Open Source*? Does it have *Microsoft licensing* dependencies?\n"
        "   - If No  → Is the database size *large (>300 GB)*?\n\n"
        "Feel free to answer all at once or one at a time."
    )


# ---------------------------------------------------------------------------
# Quick smoke-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    test_cases = [
        "my name is John Smith, arch review yes, epic EPIC-2024-DB, sysid SYS-12345, transactional, structured, CFG developed, ACID yes, open source, no microsoft licensing",
        "architect: Jane Doe, architecture review no, sysid BM-999, transactional, structured, CFG developed, ACID yes, no open source, microsoft licensing yes",
        "my name is Alice Brown, sysid SYS-777, transactional, structured, CFG developed, no ACID, large database",
        "transactional, structured, CFG developed, no ACID, small database",
        "analytics use case",
        "unstructured data",
        "vendor application",
        "I need a postgresql database",
        "I need a mysql database",
        "I need an MS SQL Server",
        "yes",
        "no",
        "start over",
        "tell me about your services",  # unknown → clarification
    ]

    for msg in test_cases:
        print(f"\nUser: {msg}")
        print(f"Bot:  {process_user_input(msg)}")
        print("-" * 60)
