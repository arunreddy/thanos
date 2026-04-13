from typing import Any, Dict, List, Optional

from app.connectors.db_recommendation import process_user_input as db_recommend
from app.connectors.db_provisioning import process_user_input as db_provision
from app.connectors.kafka_assist import get_mock_response as kafka_respond
from app.connectors.health_monitoring import process_health_request


class LLMConnector:
    """
    Mock LLM connector that returns canned responses based on keyword matching.
    DB recommendation and Kafka assist intents delegate to dedicated handlers.
    TODO: Replace with real LLM integration (OpenAI, Anthropic, etc.)
    """

    INTENT_KEYWORDS: Dict[str, List[str]] = {
        "recommend_database": ["recommend", "suggestion", "which database", "best db", "what db", "i need a database", "database for"],
        "provision_database": ["provision", "create database", "set up", "new database", "spin up"],
        "health_check": [
            "health", "status", "slow queries", "connection pool", "performance",
            "datadog", "metrics", "metric", "monitoring", "monitor", "vitals",
            "cpu", "memory", "disk", "connections", "throughput", "latency",
            "rds", "instance", "database health", "db health", "db metrics",
            "observability", "observe",
        ],
        "kafka_assist": ["kafka", "consumer lag", "producer", "topic", "dead letter", "service account", "api key"],
        "explore_schema": ["schema", "tables", "columns", "explore", "structure"],
        "analyze_query": ["query", "explain", "execution plan", "optimize", "index"],
    }

    # Track which conversations are in a recommend_database or kafka_assist flow
    # so follow-up messages (like "yes", "no") stay in the same intent
    _conversation_intents: Dict[str, str] = {}

    MOCK_RESPONSES: Dict[str, Dict[str, Any]] = {
        "recommend_database": {
            "text": (
                "Based on your requirements, I'd recommend **PostgreSQL** for its excellent "
                "support for complex queries, JSONB storage, and strong community. "
                "For high-throughput write workloads, consider **Apache Cassandra**. "
                "For document-heavy applications, **MongoDB** is a solid choice."
            ),
            "buttons": [
                {"title": "Tell me more about PostgreSQL", "payload": "recommend PostgreSQL details"},
                {"title": "Compare options", "payload": "compare database options"},
            ],
        },
        "provision_database": {
            "text": (
                "I can help you provision a new database. I'll need a few details:\n\n"
                "- **Database type**: PostgreSQL, MySQL, or MongoDB\n"
                "- **Environment**: dev, staging, or production\n"
                "- **Team/owner**: Who will own this database?\n\n"
                "Please provide these details and I'll get it set up."
            ),
            "buttons": [
                {"title": "PostgreSQL", "payload": "provision PostgreSQL"},
                {"title": "MySQL", "payload": "provision MySQL"},
                {"title": "MongoDB", "payload": "provision MongoDB"},
            ],
        },
        "health_check": {
            "text": (
                "Running health diagnostics on **PROD-DB-01**... "
                "Found 3 slow queries above threshold. Results and performance snapshot are ready."
            ),
            "buttons": [
                {"title": "Show slow queries", "payload": "show slow queries"},
                {"title": "Full report", "payload": "full health report"},
            ],
            "custom": {
                "form_type": "health",
                "text": "Performance snapshot for PROD-DB-01",
                "objects": {
                    "database_name": "PROD-DB-01",
                    "timestamp": "2026-03-23T21:00:00Z",
                    "vitals": {
                        "cpu_usage": 78,
                        "memory_usage": 62,
                        "disk_io": 88,
                        "connections": 142,
                        "max_connections": 200,
                        "cache_hit": 94.2,
                        "tps": 2840,
                    },
                    "locks": [
                        {"pid": 18432, "query": "UPDATE transactions...", "wait_type": "Lock", "duration": "4.2s", "state": "BLOCKED"},
                        {"pid": 18441, "query": "SELECT * FROM loans...", "wait_type": "IO", "duration": "1.8s", "state": "WAITING"},
                        {"pid": 18445, "query": "INSERT INTO audit...", "wait_type": "CPU", "duration": "0.4s", "state": "ACTIVE"},
                        {"pid": 18449, "query": "SELECT COUNT(*) FROM...", "wait_type": "", "duration": "0.1s", "state": "IDLE"},
                    ],
                    "suggestions": [
                        {"severity": "CRITICAL", "message": "Disk I/O at 88% — Approaching saturation. Review pg_stat_bgwriter, increase shared_buffers, or enable huge_pages."},
                        {"severity": "HIGH", "message": "PID 18432 blocking chain — Lock wait exceeds 4s. Run SELECT pg_blocking_pids(18432). Consider pg_terminate_backend() if stale."},
                    ],
                },
            },
        },
        "kafka_assist": {
            "text": (
                "Here's your Kafka cluster overview:\n\n"
                "**Brokers**: 3/3 online\n"
                "**Topics**: 24 active\n"
                "**Consumer Groups**: 12\n"
                "**Consumer Lag**: 2 groups with notable lag\n\n"
                "Would you like me to drill into a specific topic or consumer group?"
            ),
            "buttons": [
                {"title": "Show consumer lag", "payload": "show consumer lag details"},
                {"title": "List topics", "payload": "list kafka topics"},
            ],
        },
        "explore_schema": {
            "text": (
                "Here are the schema definitions for the **employee_sample** database. "
                "Click below to explore the full schema in the context panel."
            ),
            "buttons": [],
            "custom": {
                "form_type": "download",
                "text": "Schema definitions for employee_sample",
                "file_name": "schema_definitions.json",
                "objects": {
                    "database_type": "postgresql",
                    "database_name": "employee_sample",
                    "definitions": {
                        "tables": [
                            {
                                "name": "employees",
                                "columns": [
                                    {"name": "id", "type": "integer", "nullable": False, "primary_key": True},
                                    {"name": "first_name", "type": "varchar(100)", "nullable": False},
                                    {"name": "last_name", "type": "varchar(100)", "nullable": False},
                                    {"name": "email", "type": "varchar(255)", "nullable": False},
                                    {"name": "department_id", "type": "integer", "nullable": True},
                                    {"name": "position_id", "type": "integer", "nullable": True},
                                    {"name": "manager_id", "type": "integer", "nullable": True},
                                    {"name": "hire_date", "type": "date", "nullable": False},
                                ],
                                "row_count": 40,
                            },
                            {
                                "name": "departments",
                                "columns": [
                                    {"name": "id", "type": "integer", "nullable": False, "primary_key": True},
                                    {"name": "name", "type": "varchar(100)", "nullable": False},
                                    {"name": "manager_id", "type": "integer", "nullable": True},
                                ],
                                "row_count": 8,
                            },
                            {
                                "name": "positions",
                                "columns": [
                                    {"name": "id", "type": "integer", "nullable": False, "primary_key": True},
                                    {"name": "title", "type": "varchar(100)", "nullable": False},
                                    {"name": "salary_min", "type": "numeric", "nullable": True},
                                    {"name": "salary_max", "type": "numeric", "nullable": True},
                                ],
                                "row_count": 26,
                            },
                            {
                                "name": "projects",
                                "columns": [
                                    {"name": "id", "type": "integer", "nullable": False, "primary_key": True},
                                    {"name": "name", "type": "varchar(200)", "nullable": False},
                                    {"name": "status", "type": "varchar(20)", "nullable": False},
                                    {"name": "start_date", "type": "date", "nullable": True},
                                    {"name": "end_date", "type": "date", "nullable": True},
                                ],
                                "row_count": 8,
                            },
                        ],
                    },
                },
            },
        },
        "analyze_query": {
            "text": (
                "I've analyzed your query. Click below to view the full execution plan "
                "with cost breakdown and optimization suggestions."
            ),
            "buttons": [],
            "custom": {
                "form_type": "execution_plan",
                "text": "Execution plan analysis",
                "objects": {
                    "metadata": {
                        "query": "SELECT e.first_name, e.last_name, d.name FROM employees e JOIN departments d ON e.department_id = d.id ORDER BY e.last_name",
                        "timestamp": "2026-03-23T21:00:00Z",
                        "connection_endpoint": "postgresql://employee_user@localhost:45433/employee_sample",
                    },
                    "execution_plan": {
                        "json": [
                            {
                                "Plan": {
                                    "Node Type": "Sort",
                                    "Startup Cost": 38.10,
                                    "Total Cost": 45.23,
                                    "Plan Rows": 40,
                                    "Actual Total Time": 12.5,
                                    "Actual Rows": 40,
                                    "Output": ["e.first_name", "e.last_name", "d.name"],
                                    "Sort Key": ["e.last_name"],
                                },
                                "Planning Time": 0.85,
                                "Execution Time": 12.5,
                            }
                        ],
                        "text": "Sort  (cost=38.10..45.23 rows=40 width=64) (actual time=8.2..12.5 rows=40 loops=1)\n  Sort Key: e.last_name\n  ->  Hash Join  (cost=12.08..38.10 rows=40 width=64)\n        Hash Cond: (e.department_id = d.id)\n        ->  Seq Scan on employees e  (cost=0.00..21.40 rows=40 width=48)\n        ->  Hash  (cost=12.08..12.08 rows=8 width=20)\n              ->  Seq Scan on departments d  (cost=0.00..12.08 rows=8 width=20)",
                    },
                    "analyzed": True,
                    "cost": 45.23,
                    "rows": 40,
                    "execution_time": 12.5,
                    "planning_time": 0.85,
                },
            },
        },
        "fallback": {
            "text": (
                "I'm your Database Operations Assistant. I can help you with:\n\n"
                "- **Recommend** the right database for your use case\n"
                "- **Provision** new database instances\n"
                "- **Health checks** and performance monitoring\n"
                "- **Kafka** topic and consumer management\n"
                "- **Schema exploration** and documentation\n"
                "- **Query analysis** and optimization\n\n"
                "What would you like to do?"
            ),
            "buttons": [
                {"title": "Recommend a database", "payload": "recommend a database"},
                {"title": "Check health", "payload": "run health check"},
                {"title": "Explore schema", "payload": "explore schema"},
            ],
        },
    }

    async def send_message(
        self,
        message: str,
        conversation_id: str,
        auth_headers: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Process a message and return a mock LLM response.
        DB recommendation and Kafka assist intents use dedicated handlers.
        """
        intent = self._classify_intent(message)

        # Check if this conversation is already in a multi-turn flow
        prev_intent = self._conversation_intents.get(conversation_id)
        if prev_intent in ("recommend_database", "kafka_assist", "provision_database", "health_check") and intent == "fallback":
            # Stay in the same flow for follow-up messages like "yes", "no", etc.
            intent = prev_intent

        # Track the active intent for this conversation
        self._conversation_intents[conversation_id] = intent

        # Delegate to dedicated handlers
        if intent == "recommend_database":
            text = db_recommend(message)
            return {
                "text": text,
                "buttons": [],
                "intent": intent,
                "custom": {},
            }

        if intent == "provision_database":
            text = db_provision(message, conversation_id)
            return {
                "text": text,
                "buttons": [],
                "intent": intent,
                "custom": {},
            }

        if intent == "kafka_assist":
            text = kafka_respond(message)
            return {
                "text": text,
                "buttons": [],
                "intent": intent,
                "custom": {},
            }

        if intent == "health_check":
            response = await process_health_request(
                message=message,
                conversation_id=conversation_id,
                auth_headers=auth_headers,
            )
            return {
                "text": response.get("text", ""),
                "buttons": response.get("buttons", []),
                "intent": intent,
                "custom": response.get("custom", {}),
            }

        # Fall back to canned responses for other intents
        response = self.MOCK_RESPONSES.get(intent, self.MOCK_RESPONSES["fallback"])

        return {
            "text": response["text"],
            "buttons": response.get("buttons", []),
            "intent": intent,
            "custom": response.get("custom", {}),
        }

    def _normalize(self, message: str) -> str:
        """Normalize user input before intent classification.

        - Lowercases
        - Collapses extra whitespace
        - Expands common abbreviations so keyword matching is more robust
        """
        import re
        text = message.lower().strip()
        text = re.sub(r'\s+', ' ', text)

        abbreviations = {
            r'\bpg\b': 'postgres',
            r'\bpostgresql\b': 'postgres',
            r'\bdb\b': 'database',
            r'\bperf\b': 'performance',
            r'\bmon\b': 'monitoring',
            r'\bstat(s)?\b': 'status',
            r'\bconn(s)?\b': 'connections',
            r'\bdd\b': 'datadog',
        }
        for pattern, replacement in abbreviations.items():
            text = re.sub(pattern, replacement, text)
        return text

    def _classify_intent(self, message: str) -> str:
        """Keyword-based intent classification with message normalization."""
        message_lower = self._normalize(message)

        # Strip category prefix if present, e.g. "[Recommend DB] ..."
        if message_lower.startswith("[") and "]" in message_lower:
            bracket_content = message_lower[1 : message_lower.index("]")]
            # Map category labels to intents
            category_map = {
                "recommend db": "recommend_database",
                "provision db": "provision_database",
                "health": "health_check",
                "kafka assist": "kafka_assist",
            }
            for label, intent in category_map.items():
                if label in bracket_content:
                    return intent

        # Keyword matching
        best_intent = "fallback"
        best_score = 0

        for intent, keywords in self.INTENT_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in message_lower)
            if score > best_score:
                best_score = score
                best_intent = intent

        return best_intent

    async def close(self):
        """Cleanup (no-op for mock)."""
        pass
