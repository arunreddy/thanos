import json
import os
import re
import tempfile
import uuid
import logging
from typing import Any, Dict, List, Text
from urllib.parse import urlparse

import psycopg2
from rasa_sdk import Action, FormValidationAction, Tracker
from rasa_sdk.events import SlotSet
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.types import DomainDict
from urllib.parse import unquote

logger = logging.getLogger(__name__)


class ValidateExploreSchemaForm(FormValidationAction):
    def name(self) -> Text:
        return "validate_explore_schema_form"

    def validate_connection_string(
        self,
        slot_value: Text,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        if not slot_value:
            dispatcher.utter_message(text="Please provide a connection string.")
            return {"connection_string": None}

        database_type = tracker.get_slot("database_type")
        if not database_type:
            dispatcher.utter_message(text="Please select a database type first.")
            return {"connection_string": None}

        # parse out the "default" schema from the URL
        parsed = urlparse(slot_value)
        target_schema = parsed.path.lstrip("/")
        

        db_host = parsed.hostname
        db_port = parsed.port
        db_user = parsed.username
        db_password = unquote(parsed.password) 

        # connection-string patterns (removed regex validation, rely on urlparse)


        # ── PostgreSQL ──────────────────────────────────────────────────────────
        if database_type.lower() == "postgresql":
            # No regex validation, rely on urlparse and connection attempt

            # test connection
            try:
                conn = psycopg2.connect(slot_value)
                conn.close()
            except Exception as e:
                dispatcher.utter_message(text=f"Could not connect to PostgreSQL database: {e}")
                return {"connection_string": None}

            # fetch schemas
            try:
                available = self._fetch_available_schemas(slot_value, database_type)
            except Exception:
                available = []

            # if none returned, default to the one you passed
            if not available:
                dispatcher.utter_message(text=f"Selected schemas: **{target_schema}**")

                return {
                    "connection_string": slot_value,
                    "selected_schemas": [target_schema]
                }

            # otherwise always list what you did find
            schema_list = ", ".join(available)
            dispatcher.utter_message(text=(
                f"**Available schemas in your {database_type} database:**\n\n"
                f"{schema_list}\n\n"
                "Please select which schemas you want to explore "
                "(separate multiple schemas with commas or spaces):"
            ))
            return {"connection_string": slot_value}

        # ── MySQL ───────────────────────────────────────────────────────────────
        elif database_type.lower() == "mysql":
            # No regex validation, rely on urlparse and connection attempt

            # test connection
            try:
                import mysql.connector
                conn = mysql.connector.connect(
                    host=db_host,
                    port=db_port,
                    user=db_user,
                    password=db_password
                )
                conn.close()
            except ImportError:
                dispatcher.utter_message(text=(
                    "mysql-connector-python library required. Install with:\n"
                    "pip install mysql-connector-python"
                ))
                return {"connection_string": None}
            except Exception as e:
                dispatcher.utter_message(text=f"Could not connect to MySQL database: {e}")
                return {"connection_string": None}

            # fetch schemas
            try:
                available = self._fetch_available_schemas(slot_value, database_type)
            except Exception:
                available = []

            # if none returned, default to the one you passed
            if not available:
                dispatcher.utter_message(text=f"Selected schemas: **{target_schema}**")
                return {
                    "connection_string": slot_value,
                    "selected_schemas": [target_schema]
                }

            # otherwise always list what you did find
            schema_list = ", ".join(available)
            dispatcher.utter_message(text=(
                f"**Available schemas in your {database_type} database:**\n\n"
                f"{schema_list}\n\n"
                "Please select which schemas you want to explore "
                "(separate multiple schemas with commas or spaces):"
            ))
            return {"connection_string": slot_value}

        # ── MongoDB ──────────────────────────────────────────────────────────
        elif database_type.lower() == "mongodb":
            # No regex validation, rely on urlparse and connection attempt

            # test connection
            try:
                from pymongo import MongoClient
                client = MongoClient(slot_value)
                client.admin.command('ping')
                client.close()
            except ImportError:
                dispatcher.utter_message(text=(
                    "pymongo library required. Install with:\n"
                    "pip install pymongo"
                ))
                return {"connection_string": None}
            except Exception as e:
                dispatcher.utter_message(text=f"Could not connect to MongoDB database: {e}")
                return {"connection_string": None}

            # For MongoDB, we'll work with the single database specified in connection string
            parsed = urlparse(slot_value)
            target_db = parsed.path.lstrip("/")
            dispatcher.utter_message(text=f"✅ Selected database: **{target_db}**")
            return {
                "connection_string": slot_value,
                "selected_schemas": [target_db]
            }

        # ── Unsupported ─────────────────────────────────────────────────────────
        else:
            dispatcher.utter_message(text="Unsupported database type. Please select PostgreSQL, MySQL, or MongoDB.")
            return {"connection_string": None}

    def validate_selected_schemas(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        """
        Validate user's schema selection (schemas were already shown during connection validation).
        """
        database_type = tracker.get_slot("database_type")
        conn_str = tracker.get_slot("connection_string")
        
        print(f"DEBUG: validate_selected_schemas called with slot_value: {slot_value}")
        
        if not conn_str or not database_type:
            dispatcher.utter_message(text="Connection information is missing.")
            return {"selected_schemas": None}

        try:
            # Fetch available schemas for validation
            available_schemas = self._fetch_available_schemas(conn_str, database_type)
            
            if not available_schemas:
                dispatcher.utter_message(text="No schemas found in the database.")
                return {"selected_schemas": None}

            # Handle empty input (user didn't provide any schemas)
            if not slot_value or (isinstance(slot_value, str) and slot_value.strip() == "") or (isinstance(slot_value, list) and (len(slot_value) == 0 or (len(slot_value) == 1 and slot_value[0].strip() == ""))):
                schema_list = ", ".join(available_schemas)
                dispatcher.utter_message(text=f"Please select from available schemas: {schema_list}")
                return {"selected_schemas": None}

            # Parse user input - handle both string and list formats
            user_schemas = []
            
            if isinstance(slot_value, str):
                # Handle comma or space separated input
                if "," in slot_value:
                    user_schemas = [s.strip() for s in slot_value.split(",") if s.strip()]
                else:
                    user_schemas = [s.strip() for s in slot_value.split() if s.strip()]
            elif isinstance(slot_value, list):
                # Handle list input (flatten and clean)
                for item in slot_value:
                    if isinstance(item, str):
                        if "," in item:
                            # Handle comma-separated strings within list
                            parts = [s.strip() for s in item.split(",") if s.strip()]
                            user_schemas.extend(parts)
                        elif item.strip():
                            user_schemas.append(item.strip())
            
            # Remove any empty strings
            user_schemas = [s for s in user_schemas if s]

            if not user_schemas:
                schema_list = ", ".join(available_schemas)
                dispatcher.utter_message(text=f"Please select from available schemas: {schema_list}")
                return {"selected_schemas": None}

            # Validate user selection against available schemas (case-insensitive)
            available_lower = [s.lower() for s in available_schemas]
            valid_schemas = []
            invalid_schemas = []
            
            for schema in user_schemas:
                schema_lower = schema.lower()
                if schema_lower in available_lower:
                    # Find original case
                    original_schema = available_schemas[available_lower.index(schema_lower)]
                    valid_schemas.append(original_schema)
                else:
                    invalid_schemas.append(schema)

            # Show validation results
            if invalid_schemas:
                schema_list = ", ".join(available_schemas)
                invalid_list = ", ".join(invalid_schemas)
                dispatcher.utter_message(

                    text=f"Invalid schema(s): **{invalid_list}**\n\n" +
                         f"Available schemas: {schema_list}\n\n" +
                         f"Please select valid schemas from the list above."
                )
                return {"selected_schemas": None}

            if valid_schemas:
                selected_list = ", ".join(valid_schemas)
                dispatcher.utter_message(text=f"Selected schemas: **{selected_list}**")
                return {"selected_schemas": valid_schemas}

            return {"selected_schemas": None}

        except Exception as e:
            logger.error(f"Error in validate_selected_schemas: {e}", exc_info=True)
            print(f"DEBUG: Exception occurred: {e}")
            dispatcher.utter_message(text=f"Error validating schemas: {e}")
            return {"selected_schemas": None}

    def _fetch_available_schemas(self, conn_str: str, database_type: str) -> List[str]:
        """Fetch available schemas from database."""
        print(f"DEBUG: _fetch_available_schemas called with database_type: {database_type}")
        if database_type.lower() == "postgresql":
            return self._fetch_postgresql_schemas(conn_str)
        elif database_type.lower() == "mysql":
            return self._fetch_mysql_schemas(conn_str)
        elif database_type.lower() == "mongodb":
            return self._fetch_mongodb_schemas(conn_str)
        else:
            print(f"DEBUG: Unsupported database type: {database_type}")
            return []

    def _fetch_postgresql_schemas(self, conn_str: str) -> List[str]:
        """Fetch PostgreSQL schemas."""
        print(f"DEBUG: Attempting to connect to PostgreSQL with: {conn_str}")
        try:
            conn = psycopg2.connect(conn_str)
            cursor = conn.cursor()
            print(f"DEBUG: Connected successfully to PostgreSQL")
            try:
                cursor.execute("""
                    SELECT nspname FROM pg_namespace
                    WHERE nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
                    AND nspname NOT LIKE 'pg_temp_%' AND nspname NOT LIKE 'pg_toast_temp_%'
                    ORDER BY nspname
                """)
                schemas = [row[0] for row in cursor.fetchall()]
                print(f"DEBUG: PostgreSQL schemas found: {schemas}")
                return schemas
            finally:
                conn.close()
                print(f"DEBUG: PostgreSQL connection closed")
        except Exception as e:
            print(f"DEBUG: Error connecting to PostgreSQL: {e}")
            raise

    def _fetch_mysql_schemas(self, conn_str: str) -> List[str]:
        """Fetch MySQL schemas (databases)."""
        try:
            import mysql.connector
            parsed = urlparse(conn_str)
            target_db = parsed.path.lstrip("/")  # the database you connected to
            conn = mysql.connector.connect(
                host=parsed.hostname,
                port=parsed.port,
                user=parsed.username,
                password=parsed.password
            )
            cursor = conn.cursor()
            try:
                cursor.execute("SHOW DATABASES")
                # filter out system schemas
                all_dbs = [
                    row[0]
                    for row in cursor.fetchall()
                    if row[0] not in ('information_schema', 'performance_schema', 'mysql', 'sys')
                ]
            finally:
                conn.close()
            # if your target is in the list, return only that; otherwise return all
            if target_db in all_dbs:
                return [target_db]
            return all_dbs
        except ImportError:
            raise Exception("mysql-connector-python library required")

    def _fetch_mongodb_schemas(self, conn_str: str) -> List[str]:
        """Fetch MongoDB database name."""
        try:
            from pymongo import MongoClient
            parsed = urlparse(conn_str)
            target_db = parsed.path.lstrip("/")
            return [target_db]
        except ImportError:
            raise Exception("pymongo library required for MongoDB")


    def validate_object_types(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        """
        Validate object types based on database type.
        """
        database_type = tracker.get_slot("database_type")
        
        # Define valid object types for each database
        valid_objects = {
            "postgresql": {"tables", "views", "functions", "sequences", "indexes", "constraints", "triggers", "materialized_views", "procedures", "schemas"},
            "mysql": {"tables", "views", "functions", "procedures", "triggers", "indexes", "constraints"},
            "mongodb": {"collections", "indexes", "views"}

        }
        
        if not database_type or database_type.lower() not in valid_objects:
            dispatcher.utter_message(text="Please select a valid database type first.")
            return {"object_types": None}
            
        supported = valid_objects[database_type.lower()]
        
        # Normalize the input to lowercase
        if isinstance(slot_value, str):
            slot_value = slot_value.lower()
        elif isinstance(slot_value, list):
            slot_value = [item.lower() for item in slot_value if isinstance(item, str)]
            
        # If slot_value is None or empty, return None
        if not slot_value:
            dispatcher.utter_message(text="Please provide valid object types.")
            return {"object_types": None}
            
        # Initialize selected list
        selected = []

        # Handle different input formats
        if isinstance(slot_value, list):
            # If it's a list with comma-separated strings inside
            for item in slot_value:
                if isinstance(item, str) and "," in item:
                    # Split each comma-separated string
                    parts = [part.strip().lower() for part in item.split(",") if part.strip()]
                    selected.extend([part for part in parts if part in supported])
                else:
                    # Regular list item
                    if isinstance(item, str) and item.strip().lower() in supported:
                        selected.append(item.strip().lower())
        elif isinstance(slot_value, str):
            # If it's a string with commas
            if "," in slot_value:
                parts = [part.strip().lower() for part in slot_value.split(",") if part.strip()]
            else:
                # If it's a string with spaces
                parts = [part.strip().lower() for part in slot_value.split() if part.strip()]

            selected = [part for part in parts if part in supported]

        if selected:
            return {"object_types": selected}

        # Database-specific error message
        supported_list = ", ".join(sorted(supported))
        dispatcher.utter_message(text=f"Please choose valid {database_type} object types: {supported_list}. Separate multiple types with spaces or commas.")
        return {"object_types": None}


class ActionSubmitSchemaExplore(Action):
    def name(self) -> Text:
        return "action_submit_schema_explore"

    async def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> List[Dict[Text, Any]]:
        database_type = tracker.get_slot("database_type")
        conn_str = tracker.get_slot("connection_string")
        selected_schemas = tracker.get_slot("selected_schemas") or []
        object_types = tracker.get_slot("object_types") or []

        print(f"ActionSubmitSchemaExplore#{database_type} Selected schemas: {selected_schemas}, Object types: {object_types}")

        # Ensure both are lists
        if isinstance(selected_schemas, str):
            selected_schemas = [selected_schemas]
        if isinstance(object_types, str):
            if "," in object_types:
                object_types = [obj.strip().lower() for obj in object_types.split(",") if obj.strip()]
            else:
                object_types = [object_types.lower()]

        # Parse the connection string to get host and port
        host_port = "unknown"
        if conn_str:
            try:
                if database_type.lower() == "postgresql":
                    match = re.search(r"@([^/]+)/", conn_str)
                    if match:
                        host_port = match.group(1)
                elif database_type.lower() == "mysql":
                    parsed = urlparse(conn_str)
                    host_port = f"{parsed.hostname}:{parsed.port}"
                elif database_type.lower() == "mongodb":
                    parsed = urlparse(conn_str)
                    host_port = f"{parsed.hostname}:{parsed.port}"
            except Exception:
                host_port = "unknown"
                
        events = []
        events.append(SlotSet("database_host_endpoint", host_port))
        
        # Initialize the output structure
        schema_data = {
            "comments": "Review the object lists and keep only the required objects",
            "database_type": database_type,
            "database_host_endpoint": host_port,
            "selected_schemas": selected_schemas,
            "objects": {}
        }

        try:
            # Get objects based on database type for selected schemas
            if database_type.lower() == "postgresql":
                schema_data["objects"] = self._fetch_postgresql_objects(conn_str, object_types, selected_schemas)
            elif database_type.lower() == "mysql":
                schema_data["objects"] = self._fetch_mysql_objects(conn_str, object_types, selected_schemas)
            elif database_type.lower() == "mongodb":
                schema_data["objects"] = self._fetch_mongodb_objects(conn_str, object_types, selected_schemas)
            else:
                dispatcher.utter_message(text="Unsupported database type.")
                return events

            # Convert schema data to JSON string
            schema_json = json.dumps(schema_data, indent=4)

            # Store available objects in dedicated slot
            return [
                SlotSet("database_host_endpoint", host_port),
                SlotSet("available_objects", schema_data["objects"]),
                SlotSet("schema_file_path", schema_json)
            ]

        except Exception as e:
            logger.error(f"Error fetching {database_type} schema: {e}", exc_info=True)
            dispatcher.utter_message(text=f"Error fetching {database_type} schema: {e}")
            return events

    def _fetch_postgresql_objects(self, conn_str: str, object_types: List[str], selected_schemas: List[str]) -> Dict[str, List[str]]:
        """Fetch PostgreSQL objects from selected schemas only."""
        conn = psycopg2.connect(conn_str)
        cursor = conn.cursor()
        objects = {}

        try:
            # Create schema filter for SQL queries
            schema_filter = "(" + ",".join([f"'{schema}'" for schema in selected_schemas]) + ")"
            
            # Only query the specifically requested object types from selected schemas
            for obj in object_types:
                if obj == "tables":
                    cursor.execute(f"SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema IN {schema_filter} AND table_type='BASE TABLE';")
                    rows = cursor.fetchall()
                    objects["tables"] = [f"{r[1]}.{r[0]}" for r in rows]

                elif obj == "views":
                    cursor.execute(f"SELECT table_name, table_schema FROM information_schema.views WHERE table_schema IN {schema_filter};")
                    rows = cursor.fetchall()
                    objects["views"] = [f"{r[1]}.{r[0]}" for r in rows]

                elif obj == "functions":
                    cursor.execute(f"SELECT routine_name, routine_schema FROM information_schema.routines WHERE routine_schema IN {schema_filter} AND routine_type='FUNCTION';")
                    rows = cursor.fetchall()
                    objects["functions"] = [f"{r[1]}.{r[0]}" for r in rows]

                elif obj == "constraints":
                    cursor.execute(f"""
                        SELECT constraint_name, table_schema 
                        FROM information_schema.table_constraints 
                        WHERE table_schema IN {schema_filter} AND constraint_type = 'FOREIGN KEY';
                    """)
                    rows = cursor.fetchall()
                    objects["constraints"] = [f"{r[1]}.{r[0]}" for r in rows]

                elif obj == "indexes":
                    schema_filter_pg = " OR ".join([f"schemaname = '{schema}'" for schema in selected_schemas])
                    cursor.execute(f"SELECT indexname, schemaname FROM pg_indexes WHERE {schema_filter_pg};")
                    rows = cursor.fetchall()
                    objects["indexes"] = [f"{r[1]}.{r[0]}" for r in rows]

                elif obj == "procedures":
                    cursor.execute(f"SELECT routine_name, routine_schema FROM information_schema.routines WHERE routine_schema IN {schema_filter} AND routine_type='PROCEDURE';")
                    rows = cursor.fetchall()
                    objects["procedures"] = [f"{r[1]}.{r[0]}" for r in rows]

                elif obj == "triggers":
                    cursor.execute(f"""
                        SELECT trigger_name, event_object_schema 
                        FROM information_schema.triggers 
                        WHERE event_object_schema IN {schema_filter};
                    """)
                    rows = cursor.fetchall()
                    objects["triggers"] = [f"{r[1]}.{r[0]}" for r in rows]
                
                elif obj == "materialized_views":
                    cursor.execute(f"SELECT matviewname, schemaname FROM pg_matviews WHERE schemaname IN {schema_filter};")
                    rows = cursor.fetchall()
                    objects["materialized_views"] = [f"{r[1]}.{r[0]}" for r in rows]
                
                elif obj == "schemas":
                    cursor.execute(f"SELECT nspname FROM pg_namespace WHERE nspname IN {schema_filter} AND nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast');")
                    rows = cursor.fetchall()
                    objects["schemas"] = [r[0] for r in rows]

                elif obj == "sequences":
                    cursor.execute(f"SELECT sequence_name, sequence_schema FROM information_schema.sequences WHERE sequence_schema IN {schema_filter};")
                    rows = cursor.fetchall()
                    objects["sequences"] = [f"{r[1]}.{r[0]}" for r in rows]

        finally:
            conn.close()
            
        return objects

    def _fetch_mysql_objects(self, conn_str: str, object_types: List[str], selected_schemas: List[str]) -> Dict[str, List[str]]:
        """Fetch MySQL objects from selected schemas only."""
        try:
            import mysql.connector
        except ImportError:
            raise Exception("mysql-connector-python library required for MySQL")
            
        parsed = urlparse(conn_str)

        conn = mysql.connector.connect(
            host=parsed.hostname,
            port=parsed.port,
            user=parsed.username,
            password=parsed.password
        )
        
        cursor = conn.cursor()
        objects = {}

        try:
            # Create schema filter for SQL queries
            schema_filter = "(" + ",".join([f"'{schema}'" for schema in selected_schemas]) + ")"
            
            # Query MySQL-specific object types from selected schemas
            for obj in object_types:
                if obj == "tables":
                    cursor.execute(f"SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema IN {schema_filter} AND table_type='BASE TABLE';")
                    rows = cursor.fetchall()
                    objects["tables"] = [f"{r[1]}.{r[0]}" for r in rows]

                elif obj == "views":
                    cursor.execute(f"SELECT table_name, table_schema FROM information_schema.views WHERE table_schema IN {schema_filter};")
                    rows = cursor.fetchall()
                    objects["views"] = [f"{r[1]}.{r[0]}" for r in rows]

                elif obj == "functions":
                    cursor.execute(f"SELECT routine_name, routine_schema FROM information_schema.routines WHERE routine_schema IN {schema_filter} AND routine_type='FUNCTION';")
                    rows = cursor.fetchall()
                    objects["functions"] = [f"{r[1]}.{r[0]}" for r in rows]
                
                elif obj == "indexes":
                    cursor.execute(f"SELECT index_name, table_schema FROM information_schema.statistics WHERE table_schema IN {schema_filter};")
                    rows = cursor.fetchall()
                    objects["indexes"] = [f"{r[1]}.{r[0]}" for r in rows]
                
                elif obj == "constraints":
                    cursor.execute(f"""
                        SELECT constraint_name, table_schema 
                        FROM information_schema.table_constraints 
                        WHERE table_schema IN {schema_filter} AND constraint_type = 'FOREIGN KEY';
                    """)
                    rows = cursor.fetchall()
                    objects["constraints"] = [f"{r[1]}.{r[0]}" for r in rows]
                
                elif obj == "procedures":
                    cursor.execute(f"SELECT routine_name, routine_schema FROM information_schema.routines WHERE routine_schema IN {schema_filter} AND routine_type='PROCEDURE';")
                    rows = cursor.fetchall()
                    objects["procedures"] = [f"{r[1]}.{r[0]}" for r in rows]

                elif obj == "triggers":
                    cursor.execute(f"""
                        SELECT trigger_name, event_object_schema 
                        FROM information_schema.triggers 
                        WHERE event_object_schema IN {schema_filter};
                    """)
                    rows = cursor.fetchall()
                    objects["triggers"] = [f"{r[1]}.{r[0]}" for r in rows]
                
        finally:
            conn.close()
            
        return objects

    def _fetch_mongodb_objects(self, conn_str: str, object_types: List[str], selected_schemas: List[str]) -> Dict[str, List[str]]:
        """Fetch MongoDB objects from selected database."""
        try:
            from pymongo import MongoClient
        except ImportError:
            raise Exception("pymongo library required for MongoDB")
            
        client = MongoClient(conn_str)
        parsed = urlparse(conn_str)
        db_name = parsed.path.lstrip("/")
        db = client[db_name]
        
        objects = {}
        
        try:
            for obj in object_types:
                if obj == "collections":
                    collections = db.list_collection_names()
                    objects["collections"] = [f"{db_name}.{col}" for col in collections]
                
                elif obj == "indexes":
                    all_indexes = []
                    for collection_name in db.list_collection_names():
                        collection = db[collection_name]
                        indexes = collection.list_indexes()
                        for index in indexes:
                            all_indexes.append(f"{db_name}.{collection_name}.{index['name']}")
                    objects["indexes"] = all_indexes
                
                elif obj == "views":
                    # MongoDB views are collections with viewOn property
                    views = []
                    for collection_name in db.list_collection_names():
                        collection_info = db.get_collection(collection_name).options()
                        if 'viewOn' in collection_info:
                            views.append(f"{db_name}.{collection_name}")
                    objects["views"] = views
                    
        finally:
            client.close()
            
        return objects

class ActionFetchAvailableObjects(Action):
    def name(self) -> Text:
        return "action_fetch_available_objects"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: DomainDict) -> List[Dict[Text, Any]]:
        # Get available objects from slot
        available_objects = tracker.get_slot("available_objects")
        database_type = tracker.get_slot("database_type")

        print(f"ActionFetchAvailableObjects#{database_type} Available objects: {available_objects}")

        if not available_objects:
            dispatcher.utter_message(text="Sorry, I don't have any schema information yet.")
            return []

        # Create a summary of found objects
        object_summary = []
        total_objects = 0
        
        for obj_type, items in available_objects.items():
            count = len(items)
            total_objects += count
            object_summary.append(f"• {obj_type.title()}: {count}")
            
        summary_text = f" **{database_type} Schema Exploration Results**\n\n" \
                      f"Found **{total_objects}** objects:\n" + "\n".join(object_summary)

        # Display the JSON content directly
        form_message = {
            "text": "Select the objects for which you want detailed definitions:",
            "form_type": "multiselect",
            "objects": available_objects,
        }
        try:
            dispatcher.utter_message(custom=form_message)
        except Exception as e:
            # Fallback to plain text if custom message fails
            dispatcher.utter_message(text=summary_text)
            logger.error(f"Error displaying schema: {e}")

        return []


class ActionFetchObjectDefinitions(Action):
    def name(self) -> Text:
        return "action_fetch_object_definitions"

    async def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> List[Dict[Text, Any]]:
        # Get the user's message containing the JSON
        last_message = tracker.latest_message.get("text", "")
        database_type = tracker.get_slot("database_type")

        print(f"ActionFetchObjectDefinitions#{database_type} Last message: {last_message}")

        try:
            schema_selection = json.loads(last_message)

            # Get connection string from slot
            conn_str = tracker.get_slot("connection_string")
            if not conn_str:
                dispatcher.utter_message(text="Connection information is missing. Please start the schema exploration process again.")
                return []

            # Extract selected objects
            selected_objects = schema_selection.get("objects", {})
            if not selected_objects:
                dispatcher.utter_message(text="No objects were specified in your selection. Please include at least one object type.")
                return []

            # Get selected schemas from tracker to help with object resolution
            selected_schemas = tracker.get_slot("selected_schemas") or ["public"]
            print(f"DEBUG: Using selected_schemas: {selected_schemas}")

            # Step 2: Store filtered objects selection
            events = [SlotSet("filtered_objects", selected_objects)]

            # Get host endpoint
            host_endpoint = tracker.get_slot("database_host_endpoint") or "unknown"

            # Initialize definitions structure
            definitions = {
                "database_type": database_type,
                "database_host_endpoint": host_endpoint,
                "definitions": {}
            }

            # Get detailed definitions based on database type
            if database_type.lower() == "postgresql":
                definitions["definitions"] = self._get_postgresql_definitions(conn_str, selected_objects, selected_schemas)
            elif database_type.lower() == "mysql":
                definitions["definitions"] = self._get_mysql_definitions(conn_str, selected_objects, selected_schemas)
            elif database_type.lower() == "mongodb":
                definitions["definitions"] = self._get_mongodb_definitions(conn_str, selected_objects, selected_schemas)
            else:
                dispatcher.utter_message(text="Unsupported database type for detailed definitions.")
                return events

            # Generate a unique URL/path for the definitions
            tmp_dir = tempfile.gettempdir()
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".json", dir=tmp_dir)

            # Convert to JSON and save to file
            definitions_json = json.dumps(definitions, indent=4)
            tmp.write(definitions_json.encode("utf-8"))
            tmp.flush()
            tmp.close()

            # Step 3: Store definitions in dedicated slot
            events.append(SlotSet("object_definitions", definitions))

            # Step 4: Store URL in dedicated slot
            events.append(SlotSet("object_definitions_url", tmp.name))

            # Display the JSON
            form_message = {
                "text": "Please download the definitions from the link below",
                "form_type": "download",
                "file_name": f"{database_type.lower()}_definitions_{uuid.uuid4().hex[:8]}.json",
                "objects": definitions,
            }
            dispatcher.utter_message(custom=form_message)

            return events

        except Exception as e:
            logger.error(f"Error generating {database_type} definitions: {e}", exc_info=True)
            dispatcher.utter_message(text=f"Error generating {database_type} definitions: {e}")
            return []

    def _find_table_schema(self, cursor, table_name: str, selected_schemas: List[str]) -> str:
        """Find which schema contains the table."""
        print(f"DEBUG: Finding schema for table '{table_name}' in schemas: {selected_schemas}")
        for schema in selected_schemas:
            cursor.execute("""
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = %s AND table_name = %s
            """, (schema, table_name))
            if cursor.fetchone():
                print(f"DEBUG: Found table '{table_name}' in schema '{schema}'")
                return schema
        print(f"DEBUG: Table '{table_name}' not found, defaulting to 'public'")
        return "public"  # fallback

    def _find_view_schema(self, cursor, view_name: str, selected_schemas: List[str]) -> str:
        """Find which schema contains the view."""
        for schema in selected_schemas:
            cursor.execute("""
                SELECT 1 FROM information_schema.views 
                WHERE table_schema = %s AND table_name = %s
            """, (schema, view_name))
            if cursor.fetchone():
                return schema
        return "public"  # fallback

    def _find_function_schema(self, cursor, function_name: str, selected_schemas: List[str]) -> str:
        """Find which schema contains the function."""
        for schema in selected_schemas:
            cursor.execute("""
                SELECT 1 FROM information_schema.routines 
                WHERE routine_schema = %s AND routine_name = %s AND routine_type = 'FUNCTION'
            """, (schema, function_name))
            if cursor.fetchone():
                return schema
        return "public"  # fallback
    
    def _find_procedure_schema(self, cursor, procedure_name: str, selected_schemas: List[str]) -> str:
        """Find which schema contains the procedure."""
        for schema in selected_schemas:
            cursor.execute("""
                SELECT 1 FROM information_schema.routines 
                WHERE routine_schema = %s AND routine_name = %s AND routine_type = 'PROCEDURE'
            """, (schema, procedure_name))
            if cursor.fetchone():
                return schema
        return "public" # fallback

    def _generate_postgresql_create_table(self, table_name: str, columns: List[Dict], cursor, schema_name: str = "public") -> str:
        """Generate CREATE TABLE statement for PostgreSQL."""
        try:
            # Get primary keys using the original working approach
            cursor.execute("""
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                WHERE i.indrelid = %s::regclass AND i.indisprimary
            """, (f"{schema_name}.{table_name}",))
            
            primary_keys = [row[0] for row in cursor.fetchall()]
            
            # Build CREATE TABLE statement as single line
            column_definitions = []
            
            for col in columns:
                line = f"{col['name']} {col['type']}"
                
                if not col['nullable']:
                    line += " NOT NULL"
                
                if col['default']:
                    line += f" DEFAULT {col['default']}"
                
                if col['name'] in primary_keys:
                    line += " PRIMARY KEY"
                
                column_definitions.append(line)
            
            # Join all columns with commas and create single-line statement
            full_table_name = f"{schema_name}.{table_name}" if schema_name != "public" else table_name
            return f"CREATE TABLE {full_table_name} ({', '.join(column_definitions)});"
            
        except Exception as e:
            return f"-- Error generating CREATE TABLE statement: {e}"

    def _generate_mysql_create_table(self, table_name: str, columns: List[Dict], cursor, schema_name: str) -> str:
        """Generate CREATE TABLE statement for MySQL."""
        try:
            # Get primary keys
            cursor.execute(f"""
                SELECT column_name
                FROM information_schema.key_column_usage
                WHERE table_schema = %s AND table_name = %s AND constraint_name = 'PRIMARY'
            """, (schema_name, table_name))
            
            primary_keys = [row[0] for row in cursor.fetchall()]
            
            # Build CREATE TABLE statement as single line
            column_definitions = []
            
            for col in columns:
                line = f"{col['name']} {col['type']}"
                
                if not col['nullable']:
                    line += " NOT NULL"
                
                if col['default']:
                    line += f" DEFAULT {col['default']}"
                
                if col['name'] in primary_keys:
                    line += " PRIMARY KEY"
                
                column_definitions.append(line)
            
            # Join all columns with commas and create single-line statement
            return f"CREATE TABLE {table_name} ({', '.join(column_definitions)});"
            
        except Exception as e:
            return f"-- Error generating CREATE TABLE statement: {e}"

    def _get_postgresql_definitions(self, conn_str: str, selected_objects: Dict[str, List[str]], selected_schemas: List[str]) -> Dict[str, List[Dict]]:
        """Get detailed PostgreSQL object definitions with CREATE statements - schema-aware version."""
        conn = psycopg2.connect(conn_str)
        cursor = conn.cursor()
        definitions = {}

        try:
            # Process tables with CREATE TABLE statements
            if "tables" in selected_objects and selected_objects["tables"]:
                definitions["tables"] = []
                for table_name in selected_objects["tables"]:
                    print(f"DEBUG: Processing table: {table_name}")
                    
                    # Parse schema.table format or determine schema
                    if "." in table_name:
                        schema_name, table_only = table_name.split(".", 1)
                        print(f"DEBUG: Table has schema prefix: {schema_name}.{table_only}")
                    else:
                        # If no schema specified, try to find it in selected schemas
                        schema_name = self._find_table_schema(cursor, table_name, selected_schemas)
                        table_only = table_name
                        print(f"DEBUG: No schema prefix, found in schema: {schema_name}")
                    
                    # Get column information
                    cursor.execute("""
                        SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                        FROM information_schema.columns
                        WHERE table_schema = %s AND table_name = %s
                        ORDER BY ordinal_position
                    """, (schema_name, table_only))

                    columns = []
                    for col in cursor.fetchall():
                        col_name, col_type, max_length, nullable, default = col
                        if max_length:
                            col_type = f"{col_type}({max_length})"
                        columns.append({
                            "name": col_name, 
                            "type": col_type, 
                            "nullable": nullable.lower() == "yes",
                            "default": default
                        })

                    if not columns:
                        print(f"DEBUG: No columns found for table {table_name} in schema {schema_name}")
                        definitions["tables"].append({
                            "name": table_name, 
                            "columns": [],
                            "definition": f"-- Table {table_name} not found in schema {schema_name}"
                        })
                        continue

                    # Generate CREATE TABLE statement
                    create_statement = self._generate_postgresql_create_table(table_only, columns, cursor, schema_name)

                    definitions["tables"].append({
                        "name": table_name, 
                        "columns": columns,
                        "definition": create_statement
                    })
                    print(f"DEBUG: Successfully processed table: {table_name}")

            # Process views with CREATE VIEW statements
            if "views" in selected_objects and selected_objects["views"]:
                definitions["views"] = []
                for view_name in selected_objects["views"]:
                    # Parse schema.view format or determine schema
                    if "." in view_name:
                        schema_name, view_only = view_name.split(".", 1)
                    else:
                        schema_name = self._find_view_schema(cursor, view_name, selected_schemas)
                        view_only = view_name
                        
                    cursor.execute("""
                        SELECT table_name, view_definition
                        FROM information_schema.views
                        WHERE table_schema = %s AND table_name = %s
                    """, (schema_name, view_only))

                    result = cursor.fetchone()
                    if result:
                        name, view_def = result
                        clean_view_def = view_def.replace('\n', ' ').replace('\t', ' ')
                        full_view_name = f"{schema_name}.{view_only}" if schema_name != "public" else view_only
                        create_statement = f"CREATE VIEW {full_view_name} AS {clean_view_def}" 
                        definitions["views"].append({
                            "name": view_name, 
                            "definition": create_statement
                        })
                    else:
                        definitions["views"].append({
                            "name": view_name, 
                            "definition": "-- Definition not available"
                        })

            # Process functions
            if "functions" in selected_objects and selected_objects["functions"]:
                definitions["functions"] = []
                for function_name in selected_objects["functions"]:
                    # Parse schema.function format or determine schema
                    if "." in function_name:
                        schema_name, func_only = function_name.split(".", 1)
                    else:
                        schema_name = self._find_function_schema(cursor, function_name, selected_schemas)
                        func_only = function_name
                        
                    cursor.execute("""
                        SELECT p.proname as name, pg_catalog.pg_get_function_arguments(p.oid) as arguments,
                               pg_catalog.pg_get_function_result(p.oid) as return_type, p.prosrc as source
                        FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
                        WHERE n.nspname = %s AND p.proname = %s
                    """, (schema_name, func_only))

                    result = cursor.fetchone()
                    if result:
                        name, arguments, return_type, source = result
                        definitions["functions"].append({
                            "name": function_name, 
                            "arguments": arguments, 
                            "return_type": return_type, 
                            "source": source
                        })
                    else:
                        definitions["functions"].append({
                            "name": function_name, 
                            "source": "-- Definition not available"
                        })

            # Process Constraints
            if "constraints" in selected_objects and selected_objects["constraints"]:   
                definitions["constraints"] = []
                for constraint_name in selected_objects["constraints"]:
                    # Parse schema.constraint format or search in selected schemas
                    if "." in constraint_name:
                        schema_name, constraint_only = constraint_name.split(".", 1)
                    else:
                        schema_name = selected_schemas[0] if selected_schemas else "public"
                        constraint_only = constraint_name
                        
                    cursor.execute("""
                        SELECT conname, pg_catalog.pg_get_constraintdef(c.oid) as definition
                        FROM pg_constraint c JOIN pg_namespace n ON c.connamespace = n.oid
                        WHERE n.nspname = %s AND conname = %s
                    """, (schema_name, constraint_only))

                    result = cursor.fetchone()
                    if result:
                        name, definition = result
                        definitions["constraints"].append({"name": constraint_name, "definition": definition})
                    else:
                        definitions["constraints"].append({"name": constraint_name, "definition": "-- Definition not available"})
            
            # Process Indexes
            if "indexes" in selected_objects and selected_objects["indexes"]:
                definitions["indexes"] = []
                for index_name in selected_objects["indexes"]:
                    # Parse schema.index format or search in selected schemas
                    if "." in index_name:
                        schema_name, index_only = index_name.split(".", 1)
                    else:
                        schema_name = selected_schemas[0] if selected_schemas else "public"
                        index_only = index_name
                        
                    cursor.execute("""
                        SELECT indexname, indexdef
                        FROM pg_indexes
                        WHERE schemaname = %s AND indexname = %s
                    """, (schema_name, index_only))

                    result = cursor.fetchone()
                    if result:
                        name, definition = result
                        definitions["indexes"].append({"name": index_name, "definition": definition})
                    else:
                        definitions["indexes"].append({"name": index_name, "definition": "-- Definition not available"})
            
            # Process Procedures
            if "procedures" in selected_objects and selected_objects["procedures"]:
                definitions["procedures"] = []
                for procedure_name in selected_objects["procedures"]:
                    # Parse schema.procedure format or search in selected schemas
                    if "." in procedure_name:
                        schema_name, proc_only = procedure_name.split(".", 1)
                    else:
                        schema_name = selected_schemas[0] if selected_schemas else "public"
                        proc_only = procedure_name
                        
                    cursor.execute("""
                        SELECT p.proname as name, pg_catalog.pg_get_function_arguments(p.oid) as arguments,
                               pg_catalog.pg_get_function_result(p.oid) as return_type, p.prosrc as source
                        FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
                        WHERE n.nspname = %s AND p.proname = %s AND p.prokind = 'p'
                    """, (schema_name, proc_only))

                    result = cursor.fetchone()
                    if result:
                        name, arguments, return_type, source = result
                        definitions["procedures"].append({
                            "name": procedure_name, 
                            "arguments": arguments, 
                            "return_type": return_type, 
                            "source": source
                        })
                    else:
                        definitions["procedures"].append({
                            "name": procedure_name, 
                            "source": "-- Definition not available"
                        })
            
            # Process Triggers
            if "triggers" in selected_objects and selected_objects["triggers"]:
                definitions["triggers"] = []
                for trigger_name in selected_objects["triggers"]:
                    # Parse schema.trigger format or search in selected schemas
                    if "." in trigger_name:
                        schema_name, trigger_only = trigger_name.split(".", 1)
                    else:
                        schema_name = selected_schemas[0] if selected_schemas else "public"
                        trigger_only = trigger_name
                        
                    cursor.execute("""
                        SELECT tgname, pg_catalog.pg_get_triggerdef(t.oid) as definition
                        FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
                        JOIN pg_namespace n ON c.relnamespace = n.oid
                        WHERE n.nspname = %s AND tgname = %s AND NOT t.tgisinternal
                    """, (schema_name, trigger_only))

                    result = cursor.fetchone()
                    if result:
                        name, definition = result
                        definitions["triggers"].append({"name": trigger_name, "definition": definition})
                    else:
                        definitions["triggers"].append({"name": trigger_name, "definition": "-- Definition not available"})
            
            # Process Materialized Views
            if "materialized_views" in selected_objects and selected_objects["materialized_views"]:
                definitions["materialized_views"] = []
                for mv_name in selected_objects["materialized_views"]:
                    # Parse schema.matview format or search in selected schemas
                    if "." in mv_name:
                        schema_name, mv_only = mv_name.split(".", 1)
                    else:
                        schema_name = selected_schemas[0] if selected_schemas else "public"
                        mv_only = mv_name
                        
                    cursor.execute("""
                        SELECT matviewname, pg_catalog.pg_get_viewdef(m.oid, true) as definition
                        FROM pg_matviews m JOIN pg_namespace n ON m.schemaname = n.nspname
                        WHERE n.nspname = %s AND matviewname = %s
                    """, (schema_name, mv_only))

                    result = cursor.fetchone()
                    if result:
                        name, definition = result
                        full_mv_name = f"{schema_name}.{mv_only}" if schema_name != "public" else mv_only
                        create_statement = f"CREATE MATERIALIZED VIEW {full_mv_name} AS {definition.strip()}"
                        definitions["materialized_views"].append({
                            "name": mv_name, 
                            "definition": create_statement
                        })
                    else:
                        definitions["materialized_views"].append({
                            "name": mv_name, 
                            "definition": "-- Definition not available"
                        })

            # Process Schemas   
            if "schemas" in selected_objects and selected_objects["schemas"]:
                definitions["schemas"] = []
                for schema_name in selected_objects["schemas"]:
                    cursor.execute("""
                        SELECT schema_name, schema_owner
                        FROM information_schema.schemata
                        WHERE schema_name = %s
                    """, (schema_name,))

                    result = cursor.fetchone()
                    if result:
                        name, owner = result
                        definitions["schemas"].append({
                            "name": name,
                            "owner": owner,
                            "definition": f"CREATE SCHEMA {name} AUTHORIZATION {owner};"
                        })
                    else:
                        definitions["schemas"].append({"name": schema_name, "definition": "-- Definition not available"})
            
            # Process Sequences
            if "sequences" in selected_objects and selected_objects["sequences"]:
                definitions["sequences"] = []
                for sequence_name in selected_objects["sequences"]:
                    # Parse schema.sequence format or search in selected schemas
                    if "." in sequence_name:
                        schema_name, seq_only = sequence_name.split(".", 1)
                    else:
                        schema_name = selected_schemas[0] if selected_schemas else "public"
                        seq_only = sequence_name
                        
                    cursor.execute("""
                        SELECT sequence_name, data_type, increment_by, min_value, max_value, start_value, cycle_option
                        FROM information_schema.sequences
                        WHERE sequence_schema = %s AND sequence_name = %s
                    """, (schema_name, seq_only))

                    result = cursor.fetchone()
                    if result:
                        name, data_type, increment_by, min_value, max_value, start_value, cycle_option = result
                        definitions["sequences"].append({
                            "name": sequence_name,
                            "data_type": data_type,
                            "increment_by": increment_by,
                            "min_value": min_value,
                            "max_value": max_value,
                            "start_value": start_value,
                            "cycle_option": cycle_option
                        })
                    else:
                        definitions["sequences"].append({"name": sequence_name, "definition": "-- Definition not available"})
            
        finally:
            conn.close()
            
        return definitions

    def _get_mysql_definitions(self, conn_str: str, selected_objects: Dict[str, List[str]], selected_schemas: List[str]) -> Dict[str, List[Dict]]:
        """Get detailed MySQL object definitions with CREATE statements - schema-aware version."""
        try:
            import mysql.connector
        except ImportError:
            raise Exception("mysql-connector-python library required for MySQL")
            
        parsed = urlparse(conn_str)

        conn = mysql.connector.connect(
            host=parsed.hostname,
            port=parsed.port,
            user=parsed.username,
            password=parsed.password
        )
        
        cursor = conn.cursor()
        definitions = {}

        try:
            # Process MySQL tables with CREATE TABLE statements
            if "tables" in selected_objects and selected_objects["tables"]:
                definitions["tables"] = []
                for table_name in selected_objects["tables"]:
                    # Parse schema.table format or determine schema
                    if "." in table_name:
                        schema_name, table_only = table_name.split(".", 1)
                    else:
                        schema_name = selected_schemas[0] if selected_schemas else "public"
                        table_only = table_name
                        
                    cursor.execute(f"""
                        SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                        FROM information_schema.columns
                        WHERE table_schema = %s AND table_name = %s
                        ORDER BY ordinal_position
                    """, (schema_name, table_only))

                    columns = []
                    for col in cursor.fetchall():
                        col_name, col_type, max_length, nullable, default = col
                        if max_length:
                            col_type = f"{col_type}({max_length})"
                        columns.append({
                            "name": col_name,
                            "type": col_type,
                            "nullable": nullable.lower() == "yes",
                            "default": default
                        })

                    # Generate CREATE TABLE statement for MySQL
                    create_statement = self._generate_mysql_create_table(table_only, columns, cursor, schema_name)

                    definitions["tables"].append({
                        "name": table_name, 
                        "columns": columns,
                        "definition": create_statement
                    })

            # Process MySQL views with CREATE VIEW statements
            if "views" in selected_objects and selected_objects["views"]:
                definitions["views"] = []
                for view_name in selected_objects["views"]:
                    if "." in view_name:
                        schema_name, view_only = view_name.split(".", 1)
                    else:
                        schema_name = selected_schemas[0] if selected_schemas else "public"
                        view_only = view_name
                        
                    cursor.execute(f"""
                        SELECT table_name, view_definition
                        FROM information_schema.views
                        WHERE table_schema = %s AND table_name = %s
                    """, (schema_name, view_only))

                    result = cursor.fetchone()
                    if result:
                        name, view_def = result
                        clean_view_def = view_def.replace('\n', ' ').replace('\t', ' ')
                        create_statement = f"CREATE VIEW {view_name} AS {clean_view_def}" 
                        definitions["views"].append({
                            "name": view_name, 
                            "definition": create_statement
                        })
                    else:
                        definitions["views"].append({
                            "name": view_name, 
                            "definition": "-- Definition not available"
                        })

            # Process MySQL functions
            if "functions" in selected_objects and selected_objects["functions"]:
                definitions["functions"] = []
                for function_name in selected_objects["functions"]:
                    if "." in function_name:
                        schema_name, func_only = function_name.split(".", 1)
                    else:
                        schema_name = selected_schemas[0] if selected_schemas else "public"
                        func_only = function_name
                        
                    cursor.execute(f"""
                        SELECT routine_name, routine_definition, data_type as return_type
                        FROM information_schema.routines
                        WHERE routine_schema = %s AND routine_name = %s AND routine_type = 'FUNCTION'
                    """, (schema_name, func_only))

                    result = cursor.fetchone()
                    if result:
                        name, definition, return_type = result
                        definitions["functions"].append({"name": function_name, "definition": definition, "return_type": return_type})
                    else:
                        definitions["functions"].append({"name": function_name, "definition": "-- Definition not available"})

            # Process MySQL Indexes
            if "indexes" in selected_objects and selected_objects["indexes"]:
                definitions["indexes"] = []
                for index_name in selected_objects["indexes"]:
                    if "." in index_name:
                        schema_name, index_only = index_name.split(".", 1)
                    else:
                        schema_name = selected_schemas[0] if selected_schemas else "public"
                        index_only = index_name
                        
                    cursor.execute(f"""
                        SELECT DISTINCT index_name, table_name, column_name, non_unique
                        FROM information_schema.statistics
                        WHERE table_schema = %s AND index_name = %s
                        ORDER BY seq_in_index
                    """, (schema_name, index_only))

                    results = cursor.fetchall()
                    if results:
                        # Group columns by index for composite indexes
                        columns = [row[2] for row in results]
                        table_name = results[0][1]
                        is_unique = "UNIQUE" if results[0][3] == 0 else ""
                        definition = f"CREATE {is_unique} INDEX {index_only} ON {table_name} ({', '.join(columns)})"
                        definitions["indexes"].append({"name": index_name, "definition": definition})
                    else:
                        definitions["indexes"].append({"name": index_name, "definition": "-- Definition not available"})
            
            # Process MySQL Constraints
            if "constraints" in selected_objects and selected_objects["constraints"]:
                definitions["constraints"] = []
                for constraint_name in selected_objects["constraints"]:
                    if "." in constraint_name:
                        schema_name, constraint_only = constraint_name.split(".", 1)
                    else:
                        schema_name = selected_schemas[0] if selected_schemas else "public"
                        constraint_only = constraint_name
                        
                    cursor.execute(f"""
                        SELECT constraint_name, constraint_type, column_name
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu 
                        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                        WHERE tc.table_schema = %s AND tc.constraint_name = %s
                    """, (schema_name, constraint_only))

                    result = cursor.fetchall()
                    if result:
                        for row in result:
                            name, ctype, column_name = row
                            definitions["constraints"].append({
                                "name": f"{constraint_only}.{column_name}",
                                "type": ctype,
                                "definition": f"{ctype} on {column_name}"
                            })
                    else:
                        definitions["constraints"].append({"name": constraint_name, "definition": "-- Definition not available"})

            # Process MySQL Procedures
            if "procedures" in selected_objects and selected_objects["procedures"]:
                definitions["procedures"] = []
                for procedure_name in selected_objects["procedures"]:
                    if "." in procedure_name:
                        schema_name, proc_only = procedure_name.split(".", 1)
                    else:
                        schema_name = selected_schemas[0] if selected_schemas else "public"
                        proc_only = procedure_name
                        
                    cursor.execute(f"""
                        SELECT routine_name, routine_definition, data_type as return_type
                        FROM information_schema.routines
                        WHERE routine_schema = %s AND routine_name = %s AND routine_type = 'PROCEDURE'
                    """, (schema_name, proc_only))

                    result = cursor.fetchone()
                    if result:
                        name, definition, return_type = result
                        definitions["procedures"].append({"name": procedure_name, "definition": definition, "return_type": return_type})
                    else:
                        definitions["procedures"].append({"name": procedure_name, "definition": "-- Definition not available"})

            # Process MySQL Triggers
            if "triggers" in selected_objects and selected_objects["triggers"]:
                definitions["triggers"] = []
                for trigger_name in selected_objects["triggers"]:
                    if "." in trigger_name:
                        schema_name, trigger_only = trigger_name.split(".", 1)
                    else:
                        schema_name = selected_schemas[0] if selected_schemas else "public"
                        trigger_only = trigger_name
                        
                    cursor.execute(f"""
                        SELECT trigger_name, action_statement
                        FROM information_schema.triggers
                        WHERE trigger_schema = %s AND trigger_name = %s
                    """, (schema_name, trigger_only))

                    result = cursor.fetchone()
                    if result:
                        name, definition = result
                        definitions["triggers"].append({"name": trigger_name, "definition": definition})
                    else:
                        definitions["triggers"].append({"name": trigger_name, "definition": "-- Definition not available"})

        finally:
            conn.close()
            
        return definitions

    def _get_mongodb_definitions(self, conn_str: str, selected_objects: Dict[str, List[str]], selected_schemas: List[str]) -> Dict[str, List[Dict]]:
        """Get detailed MongoDB object definitions."""
        try:
            from pymongo import MongoClient
        except ImportError:
            raise Exception("pymongo library required for MongoDB")
            
        client = MongoClient(conn_str)
        parsed = urlparse(conn_str)
        db_name = parsed.path.lstrip("/")
        db = client[db_name]
        
        definitions = {}
        
        try:
            # Process collections
            if "collections" in selected_objects and selected_objects["collections"]:
                definitions["collections"] = []
                for collection_name in selected_objects["collections"]:
                    # Remove db prefix if present
                    col_name = collection_name.split(".")[-1]
                    collection = db[col_name]
                    
                    # Get sample document structure
                    sample_doc = collection.find_one()
                    schema_info = {}
                    if sample_doc:
                        schema_info = self._analyze_document_structure(sample_doc)
                    
                    definitions["collections"].append({
                        "name": collection_name,
                        "document_count": collection.count_documents({}),
                        "sample_schema": schema_info,
                    })
            
            # Process indexes
            if "indexes" in selected_objects and selected_objects["indexes"]:
                definitions["indexes"] = []
                for index_name in selected_objects["indexes"]:
                    parts = index_name.split(".")
                    if len(parts) >= 3:
                        col_name = parts[-2]
                        idx_name = parts[-1]
                        collection = db[col_name]
                        
                        # Find the specific index
                        for index in collection.list_indexes():
                            if index['name'] == idx_name:
                                # Extract index definition
                                index_def = {
                                    "name": index_name,
                                    "keys": dict(index.get('key', {})),
                                    "unique": index.get('unique', False),
                                    "sparse": index.get('sparse', False)
                                }
                                definitions["indexes"].append(index_def)
                                break
                        else:
                            definitions["indexes"].append({
                                "name": index_name,
                                "definition": "-- Index not found"
                            })

            # Process views
            if "views" in selected_objects and selected_objects["views"]:
                definitions["views"] = []
                for view_name in selected_objects["views"]:
                    parts = view_name.split(".")
                    if len(parts) >= 2:
                        col_name = parts[-1]
                        collection = db[col_name]
                        
                        # Get view definition
                        try:
                            view_info = collection.options()
                            definitions["views"].append({
                                "name": view_name,
                                "definition": f"View on {col_name}: {view_info}"
                            })
                        except Exception as e:
                            definitions["views"].append({
                                "name": view_name,
                                "definition": f"-- View definition not available: {str(e)}"
                            })
                    else:
                        definitions["views"].append({
                            "name": view_name,
                            "definition": "-- Invalid view name format"
                        })
            
        finally:
            client.close()
            
        return definitions

    def _analyze_document_structure(self, doc: dict, max_depth: int = 2) -> dict:
        """Analyze MongoDB document structure to show field types."""
        if max_depth <= 0:
            return {"...": "nested structure truncated"}
        
        schema = {}
        for key, value in doc.items():
            if isinstance(value, dict):
                schema[key] = self._analyze_document_structure(value, max_depth - 1)
            elif isinstance(value, list) and value:
                schema[key] = f"Array of {type(value[0]).__name__}"
            else:
                schema[key] = type(value).__name__
        
        return schema