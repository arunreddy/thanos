from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker, FormValidationAction
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, FollowupAction
import requests
import re
import logging

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
        """Validate PostgreSQL connection string format"""
        
        if not slot_value:
            dispatcher.utter_message(text="Please provide a connection string.")
            return {"connection_string": None}
        
        # PostgreSQL connection string pattern (accept both postgres:// and postgresql://)
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
                    text=f"Available columns in table '{slot_value}': {', '.join(columns)}\nPlease type the column name you want to drop:"
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
            dispatcher.utter_message(text="Unable to fetch columns. Please type the column name manually.")
            return {"selected_table": slot_value}

    def validate_column_to_drop(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate column selection for dropping"""
        
        if not slot_value:
            dispatcher.utter_message(text="Please select a valid column name.")
            return {"column_to_drop": None}
        
        return {"column_to_drop": slot_value}

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

class ActionFetchTablesForDrop(Action):
    """Fetch available tables from the database for drop column"""
    
    def name(self) -> Text:
        return "action_fetch_tables_for_drop"

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


class ActionFetchColumns(Action):
    """Fetch available columns from the selected table"""
    
    def name(self) -> Text:
        return "action_fetch_columns"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        connection_string = tracker.get_slot("connection_string")
        table_name = tracker.get_slot("selected_table")
        
        if not connection_string or not table_name:
            dispatcher.utter_message(text="Connection string and table name are required to fetch columns.")
            return []
        
        try:
            # Call Hoover API to get column list
            columns = self._fetch_columns_from_api(connection_string, table_name)
            
            if not columns:
                dispatcher.utter_message(
                    text=f"No columns found in table '{table_name}' or unable to connect."
                )
                return []
            
            # Create buttons for column selection
            buttons = []
            for column in columns[:15]:  # Limit to first 15 columns
                buttons.append({
                    "title": column,
                    "payload": f'/inform{{"column_to_drop":"{column}"}}'
                })
            
            # If more than 15 columns, show a note
            column_text = f"Please select the column you want to drop from table '{table_name}':"
            if len(columns) > 15:
                column_text += f"\n(Showing first 15 of {len(columns)} columns)"
            
            dispatcher.utter_message(
                text=column_text,
                buttons=buttons
            )
            
            return [SlotSet("available_columns", columns)]
            
        except Exception as e:
            logger.error(f"Error fetching columns: {str(e)}")
            dispatcher.utter_message(
                text="Sorry, I couldn't fetch the column list. Please check your connection and try again."
            )
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


class ActionGenerateDropQuery(Action):
    """Generate the ALTER TABLE DROP COLUMN query"""
    
    def name(self) -> Text:
        return "action_generate_drop_query"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        table_name = tracker.get_slot("selected_table")
        column_name = tracker.get_slot("column_to_drop")
        
        if not all([table_name, column_name]):
            dispatcher.utter_message(text="Missing required information to generate query.")
            return []
        
        try:
            # Generate ALTER TABLE DROP COLUMN query
            query = f"ALTER TABLE {table_name} DROP COLUMN {column_name};"
            
            return [SlotSet("drop_query", query)]
            
        except Exception as e:
            logger.error(f"Error generating drop query: {str(e)}")
            dispatcher.utter_message(text="Sorry, I couldn't generate the DROP COLUMN query.")
            return []


class ActionExecuteDropQuery(Action):
    """Execute the ALTER TABLE DROP COLUMN query"""
    
    def name(self) -> Text:
        return "action_execute_drop_query"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        connection_string = tracker.get_slot("connection_string")
        drop_query = tracker.get_slot("drop_query")
        table_name = tracker.get_slot("selected_table")
        column_name = tracker.get_slot("column_to_drop")
        
        if not all([connection_string, drop_query]):
            dispatcher.utter_message(text="Missing required information to execute query.")
            return []
        
        try:
            # Execute query via Hoover API
            success = self._execute_query_via_api(connection_string, drop_query)
            
            if success:
                dispatcher.utter_message(
                    text=f"✅ Column '{column_name}' has been successfully dropped from table '{table_name}'!\n\n"
                         f"⚠️ **All data in this column has been permanently deleted.**\n\n"
                         f"Executed query:\n```{drop_query}```"
                )
            else:
                dispatcher.utter_message(
                    text=f"❌ Failed to drop column '{column_name}'. Please check the query and try again.\n\n"
                         f"Query attempted:\n```{drop_query}```"
                )
            
            return []
            
        except Exception as e:
            logger.error(f"Error executing drop query: {str(e)}")
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
            return False
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return False


# Helper action to trigger table fetching after connection validation for drop column
class ActionTriggerTableFetchingForDrop(Action):
    """Trigger table fetching after connection string validation for drop column"""
    
    def name(self) -> Text:
        return "action_trigger_table_fetching_for_drop"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        return [FollowupAction("action_fetch_tables_for_drop")]


# Helper action to trigger column fetching after table selection
class ActionTriggerColumnFetching(Action):
    """Trigger column fetching after table selection"""
    
    def name(self) -> Text:
        return "action_trigger_column_fetching"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        return [FollowupAction("action_fetch_columns")]