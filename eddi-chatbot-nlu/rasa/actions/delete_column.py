from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker, FormValidationAction
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, FollowupAction
import requests
import re
import logging
import time
import urllib.parse as urlparse

logger = logging.getLogger(__name__)

class ValidateDropColumnForm(FormValidationAction):
    """Validates the drop column form inputs"""
    
    def name(self) -> Text:
        return "validate_drop_column_form"

    def validate_connection_string(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate connection string format for supported databases"""
        
        if not slot_value:
            dispatcher.utter_message(text="Please provide a connection string.")
            return {"connection_string": None}
        
        # Support multiple database types like create_column
        postgres_pattern = r'^postgres(ql)?://[^:]+:[^@]+@[^:]+:\d+/[^/]+$'
        mysql_pattern = r'^mysql://[^:]+:[^@]+@[^:]+:\d+/[^/]+$'
        redshift_pattern = r'^redshift://[^:]+:[^@]+@[^:]+:\d+/[^/]+$'
        
        if (re.match(postgres_pattern, slot_value.strip()) or 
            re.match(mysql_pattern, slot_value.strip()) or 
            re.match(redshift_pattern, slot_value.strip())):
            dispatcher.utter_message(text="✅ Connection string validated!")
            return {"connection_string": slot_value.strip()}
        else:
            dispatcher.utter_message(text="Please provide a valid connection string for the selected database type.")
            return {"connection_string": None}

    def validate_selected_table(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate table selection"""
        
        if not slot_value:
            dispatcher.utter_message(text="Please provide a table name.")
            return {"selected_table": None}
        
        if re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', slot_value.strip()):
            return {"selected_table": slot_value.strip()}
        else:
            dispatcher.utter_message(
                text="Table name should start with a letter or underscore and contain only letters, numbers, and underscores."
            )
            return {"selected_table": None}

    def validate_column_to_drop(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate column selection for dropping"""
        
        if not slot_value:
            dispatcher.utter_message(text="Please provide a column name.")
            return {"column_to_drop": None}
        
        if re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', slot_value.strip()):
            return {"column_to_drop": slot_value.strip()}
        else:
            dispatcher.utter_message(
                text="Column name should start with a letter or underscore and contain only letters, numbers, and underscores."
            )
            return {"column_to_drop": None}


class ActionGenerateDropQuery(Action):
    """Generate drop column query via Hoover API"""
    
    def name(self) -> Text:
        return "action_generate_drop_query"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Get required slots
        connection_string = tracker.get_slot("connection_string")
        table_name = tracker.get_slot("selected_table")
        column_name = tracker.get_slot("column_to_drop")
        
        if not all([connection_string, table_name, column_name]):
            dispatcher.utter_message(text="Missing required information to generate query.")
            return []
        
        try:
            # Parse connection string to extract DB details
            db_details = self._parse_connection_string(connection_string)
            
            # Prepare API request for drop column
            api_payload = {
                "dbDetails": db_details,
                "revalidate": False,
                "eventName": "DROP_COLUMN",
                "tableName": table_name,
                "columnData": [
                    {
                        "name": column_name
                    }
                ]
            }
            
            # Call Hoover API
            response = self._call_hoover_generate_api(api_payload)
            
            if response and response.get('code') == '000':
                data = response.get('data', {})
                query_id = data.get('queryId')
                query_sql = data.get('query', [])
                
                if query_id:
                    query_display = '\n'.join(query_sql) if query_sql else f"DROP COLUMN {column_name} FROM {table_name}"
                    dispatcher.utter_message(
                        text=f"✅ Drop column query generated successfully!\n\n"
                             f"**Generated SQL:**\n```sql\n{query_display}\n```\n\n"
                             f"**Query ID:** `{query_id}`\n\n"
                             f"🔄 Checking execution status..."
                    )
                    return [SlotSet("query_id", query_id), FollowupAction("action_check_drop_status")]
                else:
                    dispatcher.utter_message(
                        text="❌ Failed to get query ID from response."
                    )
                    return []
            else:
                error_message = response.get('message', 'Unknown error') if response else 'API call failed'
                dispatcher.utter_message(
                    text=f"❌ Failed to generate drop column query: {error_message}"
                )
                return []
                
        except Exception as e:
            logger.error(f"Error generating drop query: {str(e)}")
            dispatcher.utter_message(
                text=f"Sorry, I encountered an error: {str(e)}"
            )
            return []

    def _parse_connection_string(self, connection_string: str) -> Dict[str, Any]:
        """Parse connection string to extract database details"""
        
        parsed = urlparse.urlparse(connection_string)
        
        # Map database type based on connection string scheme
        type_mapping = {
            "postgresql": "POSTGRESQL",
            "postgres": "POSTGRESQL",
            "mysql": "MYSQL",
            "redshift": "REDSHIFT"
        }
        
        return {
            "type": type_mapping.get(parsed.scheme, "POSTGRESQL"),
            "host": f"{parsed.hostname}:{parsed.port}" if parsed.port else parsed.hostname,
            "userName": parsed.username,
            "pass": parsed.password,
            "databaseName": parsed.path.lstrip('/'),
            "schemaName": "liquibase"
        }

    def _call_hoover_generate_api(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Call Hoover generate API"""
        
        api_url = "https://hoover-v3-dev.p2.ocp.citizensbank.com/liquibase-service/query/generate"
        
        try:
            response = requests.post(api_url, json=payload, timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Hoover API call failed: {str(e)}")
            return {}


class ActionConfirmDropColumn(Action):
    """Confirm drop column via Hoover API"""
    
    def name(self) -> Text:
        return "action_confirm_drop_column"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        query_id = tracker.get_slot("query_id")
        
        if not query_id:
            dispatcher.utter_message(text="No query ID found. Please start over.")
            return []
        
        try:
            # Call confirm API
            response = self._call_hoover_confirm_api(query_id)
            
            if response and response.get('code') == '000':
                message = response.get('message', 'Request accepted')
                dispatcher.utter_message(
                    text=f"✅ {message}\n\nChecking execution status..."
                )
                return [FollowupAction("action_check_drop_status")]
            else:
                error_message = response.get('message', 'Unknown error') if response else 'API call failed'
                dispatcher.utter_message(
                    text=f"❌ Failed to confirm drop column: {error_message}"
                )
                return []
                
        except Exception as e:
            logger.error(f"Error confirming drop column: {str(e)}")
            dispatcher.utter_message(
                text=f"Sorry, I encountered an error: {str(e)}"
            )
            return []

    def _call_hoover_confirm_api(self, query_id: str) -> Dict[str, Any]:
        """Call Hoover confirm API"""
        
        api_url = "https://hoover-v3-dev.p2.ocp.citizensbank.com/liquibase-service/query/confirm"
        payload = {"queryId": query_id}
        
        try:
            response = requests.post(api_url, json=payload, timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Hoover confirm API call failed: {str(e)}")
            return {}


class ActionCheckDropStatus(Action):
    """Check drop column status via Hoover API"""
    
    def name(self) -> Text:
        return "action_check_drop_status"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        query_id = tracker.get_slot("query_id")
        
        if not query_id:
            dispatcher.utter_message(text="No query ID found.")
            return []
        
        try:
            # Poll status API
            status_response = self._check_status_with_polling(query_id, max_attempts=10, delay=3)
            
            if status_response:
                status = status_response.get('status', 'UNKNOWN')
                
                if status == "COMPLETED":
                    column_name = tracker.get_slot("column_to_drop")
                    table_name = tracker.get_slot("selected_table")
                    dispatcher.utter_message(
                        text=f"🎉 **Success!** Column `{column_name}` has been dropped from table `{table_name}`.\n\n"
                             f"⚠️ **All data in this column has been permanently deleted.**"
                    )
                elif status == "FAILED":
                    dispatcher.utter_message(
                        text="❌ **Drop column failed.** Please check your inputs and try again."
                    )
                elif status in ["INITIATED", "IN_PROGRESS", "PROCESSING"]:
                    dispatcher.utter_message(
                        text=f"⏳ **Drop column is in progress** (Status: {status}). Please check back later."
                    )
                else:
                    dispatcher.utter_message(
                        text=f"📊 **Drop column status:** {status}"
                    )
                    
                return [SlotSet("query_status", status)]
            else:
                dispatcher.utter_message(
                    text="❌ Unable to check status. Please try again later."
                )
                return []
                
        except Exception as e:
            logger.error(f"Error checking drop status: {str(e)}")
            dispatcher.utter_message(
                text=f"Sorry, I encountered an error while checking status: {str(e)}"
            )
            return []

    def _check_status_with_polling(self, query_id: str, max_attempts: int = 10, delay: int = 3) -> Dict[str, Any]:
        """Poll status API with retries"""
        
        api_url = f"https://hoover-v3-dev.p2.ocp.citizensbank.com/liquibase-service/query/{query_id}/status"
        
        for attempt in range(max_attempts):
            try:
                response = requests.get(api_url, timeout=30)
                response.raise_for_status()
                response_data = response.json()
                
                if response_data.get('code') == '000':
                    data = response_data.get('data', {})
                    status = data.get('status', 'UNKNOWN')
                    
                    if status in ['COMPLETED', 'FAILED']:
                        return data
                    
                    if attempt < max_attempts - 1:
                        time.sleep(delay)
                else:
                    logger.error(f"Status API returned error: {response_data.get('message')}")
                    if attempt < max_attempts - 1:
                        time.sleep(delay)
                    
            except Exception as e:
                logger.error(f"Status check attempt {attempt + 1} failed: {str(e)}")
                if attempt < max_attempts - 1:
                    time.sleep(delay)
        
        return {"status": "TIMEOUT"}


class ActionAskDropColumnFormConnectionString(Action):
    """Ask for connection string based on database type"""
    
    def name(self) -> Text:
        return "action_ask_drop_column_form_connection_string"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        db_type = tracker.get_slot("database_type")
        
        if db_type == "PostgreSQL":
            dispatcher.utter_message(response="utter_ask_connection_string_postgresql")
        elif db_type == "MySQL":
            dispatcher.utter_message(response="utter_ask_connection_string_mysql")
        elif db_type == "Redshift":
            dispatcher.utter_message(response="utter_ask_connection_string_redshift")
        else:
            dispatcher.utter_message(response="utter_ask_connection_string_postgresql")
        
        return []