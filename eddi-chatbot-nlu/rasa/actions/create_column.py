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

class ValidateCreateColumnForm(FormValidationAction):
    """Validates the create column form inputs"""
    
    def name(self) -> Text:
        return "validate_create_column_form"

    def validate_database_type(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate database type"""
        
        valid_types = ["PostgreSQL", "MySQL", "Redshift"]
        
        if slot_value in valid_types:
            return {"database_type": slot_value}
        else:
            dispatcher.utter_message(text="Please select a valid database type.")
            return {"database_type": None}

    def validate_connection_string(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate connection string format"""
        
        # ==> HEADER DEBUG LOGGING <==
        logger.info(f"=== HEADER DEBUG INFO (ValidateCreateColumnForm.validate_connection_string) ===")
        logger.info(f"Slot value: {slot_value}")
        logger.info(f"Tracker sender_id: {tracker.sender_id}")
        logger.info(f"Latest message: {tracker.latest_message}")
        logger.info(f"Latest message metadata: {getattr(tracker.latest_message, 'metadata', 'No metadata attr')}")
        
        # Check for auth headers in latest message metadata
        if hasattr(tracker.latest_message, 'metadata') and tracker.latest_message.metadata:
            logger.info(f"Message metadata contents: {tracker.latest_message.metadata}")
            auth_headers = tracker.latest_message.metadata.get('auth_headers', {})
            if auth_headers:
                logger.info(f"🔑 FOUND AUTH HEADERS: {auth_headers}")
            else:
                logger.info("❌ No auth_headers found in metadata")
        
        # Check events for any request data with auth headers
        recent_events = tracker.events[-5:] if tracker.events else []
        for i, event in enumerate(recent_events):
            event_dict = getattr(event, '__dict__', {})
            logger.info(f"Event {i}: {type(event).__name__} - {event_dict}")
            # Check if this event has metadata with auth headers
            if isinstance(event_dict, dict) and 'metadata' in event_dict:
                event_auth_headers = event_dict.get('metadata', {}).get('auth_headers', {})
                if event_auth_headers:
                    logger.info(f"🔑 FOUND AUTH HEADERS IN EVENT {i}: {event_auth_headers}")
        
        logger.info(f"=== END HEADER DEBUG (validate_connection_string) ===")
        
        # Extract auth headers for use in action
        auth_headers = self._extract_auth_headers(tracker)
        if auth_headers:
            logger.info(f"🔑 Using auth headers for database operations: {list(auth_headers.keys())}")
        
        if not slot_value:
            dispatcher.utter_message(text="Please provide a connection string.")
            return {"connection_string": None}
        
        db_type = tracker.get_slot("database_type")
        
        if db_type == "PostgreSQL":
            pattern = r'^postgres(ql)?://[^:]+:[^@]+@[^:]+:\d+/[^/]+$'
        elif db_type == "MySQL":
            pattern = r'^mysql://[^:]+:[^@]+@[^:]+:\d+/[^/]+$'
        elif db_type == "Redshift":
            pattern = r'^redshift://[^:]+:[^@]+@[^:]+:\d+/[^/]+$'
        else:
            dispatcher.utter_message(text="Please select a database type first.")
            return {"connection_string": None}
        
        if re.match(pattern, slot_value.strip()):
            dispatcher.utter_message(text="✅ Connection string validated!")
            return {"connection_string": slot_value.strip()}
        else:
            dispatcher.utter_message(
                text=f"Please provide a valid {db_type} connection string."
            )
            return {"connection_string": None}

    def validate_table_name(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate table name"""
        
        if not slot_value:
            dispatcher.utter_message(text="Please provide a table name.")
            return {"table_name": None}
        
        if re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', slot_value.strip()):
            return {"table_name": slot_value.strip()}
        else:
            dispatcher.utter_message(
                text="Table name should start with a letter or underscore and contain only letters, numbers, and underscores."
            )
            return {"table_name": None}

    def validate_column_name(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate column name"""
        
        if not slot_value:
            dispatcher.utter_message(text="Please provide a column name.")
            return {"column_name": None}
        
        if re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', slot_value.strip()):
            return {"column_name": slot_value.strip()}
        else:
            dispatcher.utter_message(
                text="Column name should start with a letter or underscore and contain only letters, numbers, and underscores."
            )
            return {"column_name": None}

    def validate_column_type(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate column data type"""
        
        if not slot_value:
            dispatcher.utter_message(text="Please provide a column data type.")
            return {"column_type": None}
        
        valid_types = [
            'integer', 'int', 'bigint', 'smallint',
            'varchar', 'text', 'char', 'character',
            'boolean', 'bool',
            'timestamp', 'date', 'time',
            'decimal', 'numeric', 'real', 'double precision',
            'json', 'jsonb', 'uuid'
        ]
        
        type_pattern = r'^[a-zA-Z_]+(\([0-9,\s]+\))?$'
        
        if re.match(type_pattern, slot_value.strip()):
            base_type = slot_value.strip().split('(')[0].lower()
            if base_type in valid_types or 'varchar' in base_type or 'char' in base_type:
                return {"column_type": slot_value.strip().lower()}
        
        dispatcher.utter_message(
            text="Please provide a valid data type (e.g., varchar, integer, boolean, timestamp)"
        )
        return {"column_type": None}

    def validate_is_primary_key(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate primary key selection"""
        
        if slot_value and slot_value.lower() in ['yes', 'true', '1']:
            return {"is_primary_key": True}
        elif slot_value and slot_value.lower() in ['no', 'false', '0']:
            return {"is_primary_key": False}
        else:
            dispatcher.utter_message(text="Please answer 'Yes' or 'No'.")
            return {"is_primary_key": None}

    def validate_default_value(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate default value"""
        
        if not slot_value:
            dispatcher.utter_message(text="Please provide a default value or type 'NULL'.")
            return {"default_value": None}
        
        return {"default_value": slot_value.strip()}

    def _extract_auth_headers(self, tracker: Tracker) -> Dict[str, Any]:
        """Extract auth headers from tracker latest message metadata"""
        try:
            if hasattr(tracker.latest_message, 'metadata') and tracker.latest_message.metadata:
                return tracker.latest_message.metadata.get('auth_headers', {})
            return {}
        except Exception as e:
            logger.error(f"Error extracting auth headers: {e}")
            return {}


class ActionGenerateColumnQuery(Action):
    """Generate column creation query via Hoover API"""
    
    def name(self) -> Text:
        return "action_generate_column_query"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Get all required slots
        db_type = tracker.get_slot("database_type")
        connection_string = tracker.get_slot("connection_string")
        table_name = tracker.get_slot("table_name")
        column_name = tracker.get_slot("column_name")
        column_type = tracker.get_slot("column_type")
        is_primary_key = tracker.get_slot("is_primary_key")
        default_value = tracker.get_slot("default_value")
        
        try:
            # Parse connection string to extract DB details
            db_details = self._parse_connection_string(connection_string, db_type)
            
            # Prepare API request
            api_payload = {
                "dbDetails": db_details,
                "revalidate": False,
                "eventName": "ADD_COLUMN",
                "tableName": table_name,
                "columnData": [
                    {
                        "name": column_name,
                        "type": column_type,
                        "primaryKey": is_primary_key,
                        "defaultvalue": default_value if default_value.upper() != 'NULL' else "NULL"
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
                    query_display = '\n'.join(query_sql) if query_sql else "Query generated"
                    dispatcher.utter_message(
                        text=f"✅ Column creation query generated successfully!\n\n"
                             f"**Generated SQL:**\n```sql\n{query_display}\n```\n\n"
                             f"**Query ID:** `{query_id}`\n\n"
                             f"🔄 Checking execution status..."
                    )
                    return [SlotSet("query_id", query_id), FollowupAction("action_check_column_status")]
                else:
                    dispatcher.utter_message(
                        text="❌ Failed to get query ID from response."
                    )
                    return []
            else:
                error_message = response.get('message', 'Unknown error') if response else 'API call failed'
                dispatcher.utter_message(
                    text=f"❌ Failed to generate column creation query: {error_message}"
                )
                return []
                
        except Exception as e:
            logger.error(f"Error generating column query: {str(e)}")
            dispatcher.utter_message(
                text=f"Sorry, I encountered an error: {str(e)}"
            )
            return []

    def _parse_connection_string(self, connection_string: str, db_type: str) -> Dict[str, Any]:
        """Parse connection string to extract database details"""
        
        parsed = urlparse.urlparse(connection_string)
        
        # Map database type to API expected format
        type_mapping = {
            "PostgreSQL": "POSTGRESQL",
            "MySQL": "MYSQL", 
            "Redshift": "REDSHIFT"
        }
        
        return {
            "type": type_mapping.get(db_type, db_type.upper()),
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


class ActionConfirmColumnCreation(Action):
    """Confirm column creation via Hoover API"""
    
    def name(self) -> Text:
        return "action_confirm_column_creation"

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
                return [FollowupAction("action_check_column_status")]
            else:
                error_message = response.get('message', 'Unknown error') if response else 'API call failed'
                dispatcher.utter_message(
                    text=f"❌ Failed to confirm column creation: {error_message}"
                )
                return []
                
        except Exception as e:
            logger.error(f"Error confirming column creation: {str(e)}")
            dispatcher.utter_message(
                text=f"Sorry, I encountered an error: {str(e)}"
            )
            return []

    def _call_hoover_confirm_api(self, query_id: str) -> Dict[str, Any]:
        """Call Hoover confirm API"""
        
        api_url = "https://hoover-v3-dev.p2.ocp.citizensbank.com/liquibase-service/query/confirm"
        payload = {"queryId": query_id}
        
        try:
            logger.info(f"Making confirm API call to: {api_url}")
            logger.info(f"Payload: {payload}")
            
            headers = {
                'Content-Type': 'application/json'
            }
            response = requests.post(api_url, json=payload, headers=headers, timeout=60, verify=False)
            logger.info(f"Response status code: {response.status_code}")
            logger.info(f"Response headers: {response.headers}")
            
            response.raise_for_status()
            response_data = response.json()
            logger.info(f"Response data: {response_data}")
            return response_data
        except requests.exceptions.RequestException as e:
            logger.error(f"Hoover confirm API request failed: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response text: {e.response.text}")
            return {}
        except Exception as e:
            logger.error(f"Hoover confirm API call failed: {str(e)}")
            return {}


class ActionCheckColumnStatus(Action):
    """Check column creation status via Hoover API"""
    
    def name(self) -> Text:
        return "action_check_column_status"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        

        query_id = tracker.get_slot("query_id")
        # ==> HEADER DEBUG LOGGING <==
        logger.info(f"=== HEADER DEBUG INFO (ActionExecuteAlterQuery) ===")
        logger.info(f"Tracker sender_id: {tracker.sender_id}")
        logger.info(f"Latest message: {tracker.latest_message}")
        
        # Deep dive into message structure
        if tracker.latest_message:
            logger.info(f"Message timestamp: {getattr(tracker.latest_message, 'timestamp', 'No timestamp')}")
            logger.info(f"Message intent: {getattr(tracker.latest_message, 'intent', 'No intent')}")
            logger.info(f"Message entities: {getattr(tracker.latest_message, 'entities', 'No entities')}")
            
        # Check for any custom data in events
        for event in tracker.events[-3:] if tracker.events else []:
            event_data = getattr(event, '__dict__', {})
            if 'metadata' in event_data or 'headers' in event_data:
                logger.info(f"Event with potential header data: {event_data}")
        
        # Extract auth headers for this action
        auth_headers = self._extract_auth_headers(tracker)
        if auth_headers:
            logger.info(f"🔑 ActionExecuteAlterQuery using auth headers: {list(auth_headers.keys())}")
            # Example: Use auth headers for database authentication
            db_auth_token = auth_headers.get('X-Database-Auth-Token')
            service_principal = auth_headers.get('X-Service-Principal')
            if db_auth_token:
                logger.info(f"🔑 Will use database auth token: {db_auth_token[:10]}...")
            if service_principal:
                logger.info(f"🔑 Will use service principal: {service_principal}")
        
        logger.info(f"=== END HEADER DEBUG (ActionExecuteAlterQuery) ===")
        
        connection_string = tracker.get_slot("connection_string")
        alter_query = tracker.get_slot("alter_query")
        table_name = tracker.get_slot("selected_table")
        column_name = tracker.get_slot("column_name")
        
        if not query_id:
            dispatcher.utter_message(text="No query ID found.")
            return []
        
        try:
            # Poll status API
            status_response = self._check_status_with_polling(query_id, max_attempts=10, delay=3)
            
            if status_response:
                status = status_response.get('status', 'UNKNOWN')
                
                if status == "COMPLETED":
                    column_name = tracker.get_slot("column_name")
                    table_name = tracker.get_slot("table_name")
                    dispatcher.utter_message(
                        text=f"🎉 **Success!** Column `{column_name}` has been created in table `{table_name}`."
                    )
                elif status == "FAILED":
                    dispatcher.utter_message(
                        text="❌ **Column creation failed.** Please check your inputs and try again."
                    )
                elif status in ["INITIATED", "IN_PROGRESS", "PROCESSING"]:
                    dispatcher.utter_message(
                        text=f"⏳ **Column creation is in progress** (Status: {status}). Please check back later."
                    )
                else:
                    dispatcher.utter_message(
                        text=f"📊 **Column creation status:** {status}"
                    )
                    
                return [SlotSet("query_status", status)]
            else:
                dispatcher.utter_message(
                    text="❌ Unable to check status. Please try again later."
                )
                return []
                
        except Exception as e:
            logger.error(f"Error checking column status: {str(e)}")
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
                    

    def _extract_auth_headers(self, tracker: Tracker) -> Dict[str, Any]:
        """Extract auth headers from tracker latest message metadata"""
        try:
            if hasattr(tracker.latest_message, 'metadata') and tracker.latest_message.metadata:
                return tracker.latest_message.metadata.get('auth_headers', {})
            return {}
        except Exception as e:
            logger.error(f"Error extracting auth headers: {e}")
            return {}


# Additional helper action to trigger table fetching in the form
class ActionRequestTableSelection(Action):
    """Helper action to request table selection after connection validation"""
    
    def name(self) -> Text:
        return "action_request_table_selection"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        return []


class ActionAskCreateColumnFormConnectionString(Action):
    """Ask for connection string based on database type"""
    
    def name(self) -> Text:
        return "action_ask_create_column_form_connection_string"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        db_type = tracker.get_slot("database_type")
        
        if db_type == "PostgreSQL":
            dispatcher.utter_message(response="utter_ask_connection_string_postgresql")
        elif db_type == "MySQL":
            dispatcher.utter_message(response="utter_ask_connection_string_mysql")
        elif db_type == "MongoDB":
            dispatcher.utter_message(response="utter_ask_connection_string_mongodb")
        elif db_type == "Redshift":
            dispatcher.utter_message(response="utter_ask_connection_string_redshift")
        else:
            dispatcher.utter_message(response="utter_ask_connection_string")
        
        return []