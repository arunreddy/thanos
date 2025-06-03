import json
import os
import re
import tempfile
import uuid
from typing import Any, Dict, List, Text

import psycopg2
from rasa_sdk import Action, FormValidationAction, Tracker
from rasa_sdk.events import SlotSet
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.types import DomainDict


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
        """Validate that the connection string is a proper Postgres URI."""
        pattern = r"^postgres:\/\/[^:]+:[^@]+@[^:]+:\d+\/[\w\-]+$"
        if isinstance(slot_value, str) and re.match(pattern, slot_value):
            # Test the connection to ensure it works
            try:
                conn = psycopg2.connect(slot_value)
                conn.close()
                return {"connection_string": slot_value}
            except Exception as e:
                dispatcher.utter_message(text=f"Could not connect to the database: {e}")
                return {"connection_string": None}
        dispatcher.utter_message(text="Invalid connection string. Please use the format: postgres://username:password@host:port/database_name")
        return {"connection_string": None}
    
    def validate_sql_query(
        self,
        slot_value: Text,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        """Validate SQL query syntax."""
        if not slot_value:
            dispatcher.utter_message(text="Please provide a SQL query.")
            return {"sql_query": None}
    
        # Normalize input by removing excess whitespace and making lowercase for checking
        normalized_query = re.sub(r'\s+', ' ', slot_value.strip().lower())
    
        # Check for common SQL patterns at the beginning
        # Support for CTEs (WITH), regular queries, and EXPLAIN queries
        sql_patterns = [
            r'^\s*with\s+.+\s+as\s+\(.+\)',  # Common Table Expressions (WITH ... AS)
            r'^\s*(select|insert|update|delete|create|alter|drop|truncate|grant|revoke|use|show|desc|explain)\s+',
            r'^\s*\(\s*select\s+',  # Subqueries that start with (SELECT
        ]
    
        # Try each pattern with DOTALL and IGNORECASE flags
        for pattern in sql_patterns:
            if re.search(pattern, slot_value, re.IGNORECASE | re.DOTALL):
                return {"sql_query": slot_value}
    
        # Additional check for simplified detection - if it contains important keywords
        important_keywords = ['select', 'from', 'where', 'group by', 'order by', 'with']
        if any(keyword in normalized_query for keyword in important_keywords):
            return {"sql_query": slot_value}
    
        dispatcher.utter_message(text="Invalid SQL syntax. Please re-enter a valid query.")
        return {"sql_query": None}


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
        connection_string = tracker.get_slot("connection_string")
        sql_query = tracker.get_slot("sql_query")
        
        dispatcher.utter_message(text="Request in Progress... Please wait while we analyze your query.")
        
        try:
            # Connect to the database
            conn = psycopg2.connect(connection_string)
            cursor = conn.cursor()
            
            # Execute EXPLAIN with analysis options
            try:
                # Get the execution plan in JSON format
                cursor.execute(f"EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS, VERBOSE) {sql_query}")
                json_plan = cursor.fetchall()[0][0]
                
                # Get the text plan for reference
                cursor.execute(f"EXPLAIN (ANALYZE, BUFFERS, VERBOSE) {sql_query}")
                text_plan_rows = cursor.fetchall()
                text_plan = "\n".join([row[0] for row in text_plan_rows])
                
                execution_plan = {
                    "json_plan": json_plan,
                    "text_plan": text_plan
                }
            except Exception as e:
                # Fall back to just EXPLAIN without execution if needed
                cursor.execute(f"EXPLAIN (FORMAT JSON, VERBOSE) {sql_query}")
                json_plan = cursor.fetchall()[0][0]
                
                cursor.execute(f"EXPLAIN (VERBOSE) {sql_query}")
                text_plan_rows = cursor.fetchall()
                text_plan = "\n".join([row[0] for row in text_plan_rows])
                
                execution_plan = {
                    "json_plan": json_plan,
                    "text_plan": text_plan,
                    "note": "Plan generated without ANALYZE option to avoid query execution."
                }
            finally:
                conn.close()
            
            # Create final output with metadata - CONSISTENT WITH SCHEMA EXPLORER
            complete_plan = {
                "metadata": {
                    "query": sql_query,
                    "timestamp": str(uuid.uuid4()),
                    "connection_endpoint": connection_string.split('@')[1].split('/')[0] if '@' in connection_string else "unknown"
                },
                "execution_plan": execution_plan
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
            dispatcher.utter_message(text=f"Error analyzing query: {e}")
            return []