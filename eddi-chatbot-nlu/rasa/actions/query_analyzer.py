import json
import os
import re
import tempfile
import uuid
import logging
from typing import Any, Dict, List, Text
from urllib.parse import urlparse

from rasa_sdk import Action, FormValidationAction, Tracker
from rasa_sdk.events import SlotSet
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.types import DomainDict

logger = logging.getLogger(__name__)


class ValidateAnalyzeQueryForm(FormValidationAction):
    def name(self) -> Text:
        return "validate_analyze_query_form"

    def validate_connection_string(
        self,
        slot_value: Text,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        """Validate connection string based on database type."""
        if not slot_value:
            dispatcher.utter_message(text="Please provide a connection string.")
            return {"connection_string": None}

        database_type = tracker.get_slot("database_type")
        
        if not database_type:
            dispatcher.utter_message(text="Please select a database type first.")
            return {"connection_string": None}

        # PostgreSQL connection string pattern
        postgres_pattern = r'^postgres(?:ql)?://[^:]+:[^@]+@[^:/]+:\d+/[^/\s]+$'
        
        # MySQL connection string pattern
        mysql_pattern = r'^mysql://[^:]+:[^@]+@[^:/]+:\d+/[^/\s]+$'
        
        if database_type.lower() == "postgresql":
            if re.match(postgres_pattern, slot_value, re.IGNORECASE):
                # Test PostgreSQL connection
                try:
                    import psycopg2
                    conn = psycopg2.connect(slot_value)
                    conn.close()
                    return {"connection_string": slot_value}
                except ImportError:
                    dispatcher.utter_message(text="psycopg2 library required for PostgreSQL connections.")
                    return {"connection_string": None}
                except Exception as e:
                    dispatcher.utter_message(text=f"Could not connect to PostgreSQL database: {e}")
                    return {"connection_string": None}
            else:
                dispatcher.utter_message(
                    text="Invalid PostgreSQL connection string format. "
                         "Please use: postgres://username:password@host:port/database_name"
                )
                return {"connection_string": None}
                
        elif database_type.lower() == "mysql":
            if re.match(mysql_pattern, slot_value, re.IGNORECASE):
                # Test MySQL connection
                try:
                    import mysql.connector
                    parsed = urlparse(slot_value)
                    conn = mysql.connector.connect(
                        host=parsed.hostname,
                        port=parsed.port,
                        database=parsed.path[1:],
                        user=parsed.username,
                        password=parsed.password
                    )
                    conn.close()
                    return {"connection_string": slot_value}
                except ImportError:
                    dispatcher.utter_message(text="mysql-connector-python library required for MySQL connections.")
                    return {"connection_string": None}
                except Exception as e:
                    dispatcher.utter_message(text=f"Could not connect to MySQL database: {e}")
                    return {"connection_string": None}
            else:
                dispatcher.utter_message(
                    text="Invalid MySQL connection string format. "
                         "Please use: mysql://username:password@host:port/database_name"
                )
                return {"connection_string": None}
        else:
            dispatcher.utter_message(text="Unsupported database type.")
            return {"connection_string": None}

    def validate_sql_query(
        self,
        slot_value: Text,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        """Validate SQL query syntax and security."""
        if not slot_value or not slot_value.strip():
            dispatcher.utter_message(text="Please provide a SQL query to analyze.")
            return {"sql_query": None}

        sql_query = slot_value.strip()
        
        # Basic length check
        if len(sql_query) < 10:
            dispatcher.utter_message(text="Query seems too short. Please provide a complete SQL query.")
            return {"sql_query": None}

        # Security check - only allow SELECT queries for analysis
        query_lower = sql_query.lower().strip()
        
        # Remove comments and whitespace
        cleaned_query = re.sub(r'--.*?\n|/\*.*?\*/', '', query_lower, flags=re.DOTALL)
        cleaned_query = re.sub(r'\s+', ' ', cleaned_query).strip()
        
        # Check if it starts with SELECT (allowing for CTEs with WITH)
        if not (cleaned_query.startswith('select ') or cleaned_query.startswith('with ')):
            dispatcher.utter_message(
                text="For security reasons, only SELECT queries are allowed for analysis. "
                     "Please provide a SELECT statement."
            )
            return {"sql_query": None}

        # Check for dangerous keywords
        dangerous_keywords = [
            'drop', 'delete', 'truncate', 'alter', 'create', 'insert', 'update',
            'grant', 'revoke', 'exec', 'execute', 'call', 'load_file', 'into outfile'
        ]
        
        for keyword in dangerous_keywords:
            if re.search(r'\b' + keyword + r'\b', cleaned_query):
                dispatcher.utter_message(
                    text=f"For security reasons, {keyword.upper()} operations are not allowed in query analysis. "
                         "Please provide a SELECT query only."
                )
                return {"sql_query": None}

        # Database-specific validation
        database_type = tracker.get_slot("database_type")
        
        if database_type:
            # Basic syntax validation based on database type
            if database_type.lower() == "mysql":
                # MySQL-specific syntax checks could go here
                pass
            elif database_type.lower() == "postgresql":
                # PostgreSQL-specific syntax checks could go here
                pass

        return {"sql_query": sql_query}


class ActionSubmitQueryAnalysis(Action):
    def name(self) -> Text:
        return "action_submit_query_analysis"

    async def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> List[Dict[Text, Any]]:
        """Execute SQL query analysis and provide the execution plan."""
        database_type = tracker.get_slot("database_type")
        connection_string = tracker.get_slot("connection_string")
        sql_query = tracker.get_slot("sql_query")
        
        dispatcher.utter_message(text="Request in Progress... Please wait while we analyze your query.")
        
        try:
            # Analyze query based on database type
            if database_type.lower() == "postgresql":
                analysis_result = self._analyze_postgresql_query(connection_string, sql_query)
            elif database_type.lower() == "mysql":
                analysis_result = self._analyze_mysql_query(connection_string, sql_query)
            else:
                dispatcher.utter_message(text="Unsupported database type for query analysis.")
                return []

            # Create final output with metadata - CONSISTENT WITH SCHEMA EXPLORER
            complete_plan = {
                "metadata": {
                    "query": sql_query,
                    "timestamp": str(uuid.uuid4()),
                    "connection_endpoint": connection_string.split('@')[1].split('/')[0] if '@' in connection_string else "unknown"
                },
                **analysis_result
            }
            
            # UPDATED: Use same file handling approach as schema_explorer.py
            # Generate a unique URL/path for the execution plan
            tmp_dir = tempfile.gettempdir()
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".json", dir=tmp_dir)

            # Convert to JSON and save to file
            plan_json = json.dumps(complete_plan, indent=4)
            tmp.write(plan_json.encode("utf-8"))
            tmp.flush()
            tmp.close()

            # Store execution plan data in dedicated slots
            events = [
                SlotSet("execution_plan_data", complete_plan),
                SlotSet("execution_plan_path", tmp.name)
            ]

            # Provide simple confirmation and download link - CONSISTENT WITH SCHEMA EXPLORER
            dispatcher.utter_message(text="Query analysis complete! Here's your execution plan:")
            
            # Display the JSON using the same format as schema explorer
            form_message = {
                "text": "Download the complete execution plan:",
                "form_type": "download",
                "file_name": f"execution_plan_{uuid.uuid4()}.json",
                "objects": complete_plan
            }
            dispatcher.utter_message(custom=form_message)

            return events
            
        except Exception as e:
            logger.error(f"Error analyzing {database_type} query: {e}", exc_info=True)
            dispatcher.utter_message(text=f"Error analyzing {database_type} query: {e}")
            return []

    def _analyze_postgresql_query(self, connection_string: str, sql_query: str) -> Dict[str, Any]:
        """Analyze PostgreSQL query execution plan."""
        import psycopg2
        
        conn = psycopg2.connect(connection_string)
        cursor = conn.cursor()
        
        try:
            # Try to get execution plan with ANALYZE
            cursor.execute(f"EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS, VERBOSE) {sql_query}")
            json_plan = cursor.fetchall()[0][0]
            
            # Get text plan for reference
            cursor.execute(f"EXPLAIN (ANALYZE, BUFFERS, VERBOSE) {sql_query}")
            text_plan_rows = cursor.fetchall()
            text_plan = "\n".join([row[0] for row in text_plan_rows])
            
            analysis = {
                "execution_plan": {
                    "json": json_plan,
                    "text": text_plan
                },
                "analyzed": True,
                "cost": json_plan[0]["Plan"].get("Total Cost", "N/A"),
                "rows": json_plan[0]["Plan"].get("Plan Rows", "N/A"),
                "execution_time": json_plan[0].get("Execution Time", "N/A"),
                "planning_time": json_plan[0].get("Planning Time", "N/A")
            }
            
        except Exception as e:
            # Fallback to EXPLAIN without ANALYZE
            logger.warning(f"ANALYZE failed, falling back to EXPLAIN: {e}")
            cursor.execute(f"EXPLAIN (FORMAT JSON, VERBOSE) {sql_query}")
            json_plan = cursor.fetchall()[0][0]
            
            cursor.execute(f"EXPLAIN (VERBOSE) {sql_query}")
            text_plan_rows = cursor.fetchall()
            text_plan = "\n".join([row[0] for row in text_plan_rows])
            
            analysis = {
                "execution_plan": {
                    "json": json_plan,
                    "text": text_plan
                },
                "analyzed": False,
                "cost": json_plan[0]["Plan"].get("Total Cost", "N/A"),
                "rows": json_plan[0]["Plan"].get("Plan Rows", "N/A"),
                "note": "Plan generated without ANALYZE to avoid query execution."
            }
        
        finally:
            conn.close()
            
        return analysis

    def _analyze_mysql_query(self, connection_string: str, sql_query: str) -> Dict[str, Any]:
        """Analyze MySQL query execution plan."""
        import mysql.connector
        from urllib.parse import urlparse
        
        parsed = urlparse(connection_string)
        
        conn = mysql.connector.connect(
            host=parsed.hostname,
            port=parsed.port,
            database=parsed.path[1:],
            user=parsed.username,
            password=parsed.password
        )
        
        cursor = conn.cursor()
        
        try:
            # Get execution plan using EXPLAIN with JSON format
            cursor.execute(f"EXPLAIN FORMAT=JSON {sql_query}")
            json_result = cursor.fetchone()[0]
            if isinstance(json_result, str):
                json_plan = json.loads(json_result)
            else:
                json_plan = json_result
            
            # Get traditional EXPLAIN output
            cursor.execute(f"EXPLAIN {sql_query}")
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            
            text_plan = f"{'  '.join(columns)}\n"
            text_plan += "\n".join([f"{'  '.join(map(str, row))}" for row in rows])
            
            analysis = {
                "execution_plan": {
                    "json": json_plan,
                    "text": text_plan
                },
                "analyzed": False,  # MySQL EXPLAIN doesn't execute the query
                "cost": "See plan details",
                "rows": "See plan details",
                "note": "MySQL execution plan (query not executed)"
            }
            
        finally:
            conn.close()
            
        return analysis

    def _format_analysis_summary(self, database_type: str, analysis: Dict[str, Any]) -> str:
        """Format analysis summary for user display."""
        if database_type.lower() == "postgresql":
            cost = analysis.get("cost", "N/A")
            rows = analysis.get("rows", "N/A")
            exec_time = analysis.get("execution_time", "N/A")
            planning_time = analysis.get("planning_time", "N/A")
            
            summary = f"**Execution Summary:**\n"
            summary += f"• Estimated Cost: {cost}\n"
            summary += f"• Estimated Rows: {rows}\n"
            
            if analysis.get("analyzed"):
                summary += f"• Execution Time: {exec_time} ms\n"
                summary += f"• Planning Time: {planning_time} ms"
            else:
                summary += f"• Note: {analysis.get('note', 'Plan only, not executed')}"
                
        elif database_type.lower() == "mysql":
            summary = f"**Execution Plan Generated:**\n"
            summary += f"• Query analyzed successfully\n"
            summary += f"• Plan available in JSON and text format\n"
            summary += f"• Note: {analysis.get('note', 'MySQL EXPLAIN (query not executed)')}"
        else:
            summary = "Analysis completed"
            
        return summary