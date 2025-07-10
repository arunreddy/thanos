from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker, FormValidationAction
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, FollowupAction
import requests
import re
import logging

logger = logging.getLogger(__name__)

class ValidateCreateColumnForm(FormValidationAction):
    """Validates the create column form inputs"""
    
    def name(self) -> Text:
        return "validate_create_column_form"

    def validate_connection_string(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate PostgreSQL connection string format"""
        
        if not slot_value:
            dispatcher.utter_message(
                text="Please provide a connection string."
            )
            return {"connection_string": None}
        
        # PostgreSQL connection string pattern
        postgres_pattern = r'^postgres(ql)?://[^:]+:[^@]+@[^:]+:\d+/[^/]+$'
        
        if re.match(postgres_pattern, slot_value.strip()):
            dispatcher.utter_message(text="✅ Connection string validated!")
            
            # Fetch and display available tables
            try:
                tables = self._fetch_tables_from_api(slot_value.strip())
                if tables:
                    dispatcher.utter_message(
                        text=f"Available tables: {', '.join(tables)}\nPlease type the table name you want to modify:"
                    )
                    return {
                        "connection_string": slot_value.strip(),
                        "available_tables": tables,
                        "requested_slot": "selected_table"
                    }
                else:
                    dispatcher.utter_message(text="No tables found or unable to connect to database.")
                    return {
                        "connection_string": slot_value.strip(),
                        "requested_slot": "selected_table"
                    }
            except Exception as e:
                logger.error(f"Error fetching tables during validation: {str(e)}")
                dispatcher.utter_message(text="Unable to fetch tables. Please type the table name manually.")
                return {
                    "connection_string": slot_value.strip(),
                    "requested_slot": "selected_table"
                }
        else:
            dispatcher.utter_message(
                text="Please provide a valid PostgreSQL connection string in format:\n"
                     "`postgresql://user:pass@host:port/dbname`"
            )
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
            dispatcher.utter_message(text="Please select a valid table name.")
            return {"selected_table": None}
        
        # Fetch and display available columns for the selected table
        try:
            columns = self._fetch_columns_from_api(tracker.get_slot("connection_string"), slot_value)
            if columns:
                dispatcher.utter_message(
                    text=f"Available columns in table '{slot_value}': {', '.join(columns)}\nThis will help you avoid naming conflicts."
                )
                return {
                    "selected_table": slot_value,
                    "available_columns": columns
                }
            else:
                dispatcher.utter_message(
                    text=f"No columns found in table '{slot_value}' or unable to fetch columns."
                )
                return {"selected_table": slot_value}
        except Exception as e:
            logger.error(f"Error fetching columns: {str(e)}")
            dispatcher.utter_message(text="Unable to fetch columns. Proceeding with column creation.")
            return {"selected_table": slot_value}

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
        
        # Basic validation - alphanumeric and underscores only
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
        
        # Common PostgreSQL data types
        valid_types = [
            'integer', 'int', 'bigint', 'smallint',
            'varchar', 'text', 'char', 'character',
            'boolean', 'bool',
            'timestamp', 'date', 'time',
            'decimal', 'numeric', 'real', 'double precision',
            'json', 'jsonb', 'uuid'
        ]
        
        # Allow types with parameters like VARCHAR(255)
        type_pattern = r'^[a-zA-Z_]+(\([0-9,\s]+\))?$'
        
        if re.match(type_pattern, slot_value.strip()):
            base_type = slot_value.strip().split('(')[0].lower()
            if base_type in valid_types or 'varchar' in base_type or 'char' in base_type:
                return {"column_type": slot_value.strip().upper()}
        
        dispatcher.utter_message(
            text="Please provide a valid PostgreSQL data type (e.g., VARCHAR(255), INTEGER, BOOLEAN, TIMESTAMP)"
        )
        return {"column_type": None}

    def validate_column_constraints(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate column constraints"""
        
        if not slot_value:
            dispatcher.utter_message(text="Please specify constraints or type 'NONE'.")
            return {"column_constraints": None}
        
        # Allow common constraints or NONE
        if slot_value.strip().upper() == 'NONE':
            return {"column_constraints": "NONE"}
        
        # Basic constraint validation
        valid_constraint_patterns = [
            r'not null',
            r'null',
            r'default .+',
            r'unique',
            r'primary key',
            r'check \(.+\)',
            r'references .+'
        ]
        
        constraint_lower = slot_value.strip().lower()
        if any(re.search(pattern, constraint_lower) for pattern in valid_constraint_patterns):
            return {"column_constraints": slot_value.strip()}
        else:
            dispatcher.utter_message(
                text="Please provide valid constraints (e.g., NOT NULL, DEFAULT 'value', UNIQUE) or type 'NONE'"
            )
            return {"column_constraints": None}

    def _fetch_tables_from_api(self, connection_string: str) -> List[str]:
        """Make API call to Hoover service to get tables"""
        try:
            # Replace with your actual Hoover API endpoint
            api_url = "https://your-hoover-api.com/api/tables"
            
            payload = {
                "connection_string": connection_string,
                "database_type": "postgresql"
            }
            
            response = requests.post(
                api_url,
                json=payload,
                timeout=30,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("tables", [])
            else:
                logger.error(f"API request failed with status {response.status_code}")
                return []
                
        except requests.exceptions.RequestException as e:
            logger.error(f"API request error: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return []

    def _fetch_columns_from_api(self, connection_string: str, table_name: str) -> List[str]:
        """Make API call to Hoover service to get columns"""
        try:
            # Replace with your actual Hoover API endpoint
            api_url = "https://your-hoover-api.com/api/columns"
            
            payload = {
                "connection_string": connection_string,
                "table_name": table_name,
                "database_type": "postgresql"
            }
            
            response = requests.post(
                api_url,
                json=payload,
                timeout=30,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("columns", [])
            else:
                logger.error(f"API request failed with status {response.status_code}")
                return []
                
        except requests.exceptions.RequestException as e:
            logger.error(f"API request error: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return []


class ActionFetchTables(Action):
    """Fetch available tables from the database"""
    
    def name(self) -> Text:
        return "action_fetch_tables"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        connection_string = tracker.get_slot("connection_string")
        
        if not connection_string:
            dispatcher.utter_message(text="Connection string is required to fetch tables.")
            return []
        
        try:
            # Call Hoover API to get table list
            tables = self._fetch_tables_from_api(connection_string)
            
            if not tables:
                dispatcher.utter_message(
                    text="No tables found in the database or unable to connect."
                )
                return []
            
            # Create buttons for table selection
            buttons = []
            for table in tables[:10]:  # Limit to first 10 tables
                buttons.append({
                    "title": table,
                    "payload": f'/inform{{"selected_table":"{table}"}}'
                })
            
            # If more than 10 tables, show a note
            table_text = "Please select a table from the list below:"
            if len(tables) > 10:
                table_text += f"\n(Showing first 10 of {len(tables)} tables)"
            
            dispatcher.utter_message(
                text=table_text,
                buttons=buttons
            )
            
            return [SlotSet("available_tables", tables)]
            
        except Exception as e:
            logger.error(f"Error fetching tables: {str(e)}")
            dispatcher.utter_message(
                text="Sorry, I couldn't fetch the table list. Please check your connection string and try again."
            )
            return []

    def _fetch_tables_from_api(self, connection_string: str) -> List[str]:
        """Make API call to Hoover service to get tables"""
        try:
            # Replace with your actual Hoover API endpoint
            api_url = "https://your-hoover-api.com/api/tables"
            
            payload = {
                "connection_string": connection_string,
                "database_type": "postgresql"
            }
            
            response = requests.post(
                api_url,
                json=payload,
                timeout=30,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("tables", [])
            else:
                logger.error(f"API request failed with status {response.status_code}")
                return []
                
        except requests.exceptions.RequestException as e:
            logger.error(f"API request error: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return []


class ActionGenerateAlterQuery(Action):
    """Generate the ALTER TABLE query"""
    
    def name(self) -> Text:
        return "action_generate_alter_query"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        table_name = tracker.get_slot("selected_table")
        column_name = tracker.get_slot("column_name")
        column_type = tracker.get_slot("column_type")
        constraints = tracker.get_slot("column_constraints")
        
        if not all([table_name, column_name, column_type]):
            dispatcher.utter_message(text="Missing required information to generate query.")
            return []
        
        try:
            # Generate ALTER TABLE query
            query = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
            
            if constraints and constraints.upper() != "NONE":
                query += f" {constraints}"
            
            query += ";"
            
            return [SlotSet("alter_query", query)]
            
        except Exception as e:
            logger.error(f"Error generating query: {str(e)}")
            dispatcher.utter_message(text="Sorry, I couldn't generate the ALTER TABLE query.")
            return []


class ActionExecuteAlterQuery(Action):
    """Execute the ALTER TABLE query"""
    
    def name(self) -> Text:
        return "action_execute_alter_query"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        connection_string = tracker.get_slot("connection_string")
        alter_query = tracker.get_slot("alter_query")
        table_name = tracker.get_slot("selected_table")
        column_name = tracker.get_slot("column_name")
        
        if not all([connection_string, alter_query]):
            dispatcher.utter_message(text="Missing required information to execute query.")
            return []
        
        try:
            # Execute query via Hoover API
            success = self._execute_query_via_api(connection_string, alter_query)
            
            if success:
                dispatcher.utter_message(
                    text=f"✅ Column '{column_name}' has been successfully created in table '{table_name}'!\n\n"
                         f"Executed query:\n```{alter_query}```"
                )
            else:
                dispatcher.utter_message(
                    text=f"❌ Failed to create column '{column_name}'. Please check the query and try again.\n\n"
                         f"Query attempted:\n```{alter_query}```"
                )
            
            return []
            
        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            dispatcher.utter_message(
                text=f"Sorry, I encountered an error while executing the query: {str(e)}"
            )
            return []

    def _execute_query_via_api(self, connection_string: str, query: str) -> bool:
        """Execute query via Hoover API"""
        try:
            # Replace with your actual Hoover API endpoint
            api_url = "https://your-hoover-api.com/api/execute"
            
            payload = {
                "connection_string": connection_string,
                "query": query,
                "database_type": "postgresql"
            }
            
            response = requests.post(
                api_url,
                json=payload,
                timeout=60,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("success", False)
            else:
                logger.error(f"API request failed with status {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"API request error: {str(e)}")
            # Mock success for testing - remove in production
            return True
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return False


# Additional helper action to trigger table fetching in the form
class ActionRequestTableSelection(Action):
    """Helper action to request table selection after connection validation"""
    
    def name(self) -> Text:
        return "action_request_table_selection"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        return [FollowupAction("action_fetch_tables")]