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
        """
        Validate connection string based on database type (PostgreSQL or MySQL).
        """
        if not slot_value:
            dispatcher.utter_message(text="Please provide a connection string.")
            return {"connection_string": None}

        database_type = tracker.get_slot("database_type")
        
        if not database_type:
            dispatcher.utter_message(text="Please select a database type first.")
            return {"connection_string": None}

        # PostgreSQL connection string pattern
        postgres_pattern = r"^postgres(?:ql)?://[^:]+:[^@]+@[^:/]+:\d+/[^/\s]+$"
        
        # MySQL connection string pattern
        mysql_pattern = r"^mysql://[^:]+:[^@]+@[^:/]+:\d+/[^/\s]+$"
        
        if database_type.lower() == "postgresql":
            if re.match(postgres_pattern, slot_value, re.IGNORECASE):
                # Test PostgreSQL connection
                try:
                    conn = psycopg2.connect(slot_value)
                    conn.close()
                    return {"connection_string": slot_value}
                except Exception as e:
                    dispatcher.utter_message(text=f"Could not connect to PostgreSQL database: {e}")
                    return {"connection_string": None}
            else:
                dispatcher.utter_message(
                    text="Invalid PostgreSQL connection string format. "
                        #  "Please use: postgres://username:password@host:port/database_name"
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
                    dispatcher.utter_message(text="mysql-connector-python library required for MySQL connections. Install with: pip install mysql-connector-python")
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
            dispatcher.utter_message(text="Unsupported database type. Please select PostgreSQL or MySQL.")
            return {"connection_string": None}

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
            "mysql": {"tables", "views", "functions", "procedures", "triggers", "indexes", "constraints"}
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

        # Debug the input
        print(f"Input object_types value: {slot_value!r}")

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

        print(f"Selected object types: {selected}")

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
        object_types = tracker.get_slot("object_types") or []

        print(f"ActionSubmitSchemaExplore#{database_type} Object types: {object_types}")

        # Ensure object_types is a list
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
                    # Extract host:port from postgres://user:pass@host:port/dbname
                    match = re.search(r"@([^/]+)/", conn_str)
                    if match:
                        host_port = match.group(1)
                elif database_type.lower() == "mysql":
                    # Extract host:port from mysql://user:pass@host:port/dbname
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
            "objects": {}
        }

        try:
            # Get objects based on database type
            if database_type.lower() == "postgresql":
                schema_data["objects"] = self._fetch_postgresql_objects(conn_str, object_types)
            elif database_type.lower() == "mysql":
                schema_data["objects"] = self._fetch_mysql_objects(conn_str, object_types)
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

    def _fetch_postgresql_objects(self, conn_str: str, object_types: List[str]) -> Dict[str, List[str]]:
        """Fetch PostgreSQL objects (existing logic)."""
        conn = psycopg2.connect(conn_str)
        cursor = conn.cursor()
        objects = {}

        try:
            # Only query the specifically requested object types
            for obj in object_types:
                if obj == "tables":
                    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
                    rows = cursor.fetchall()
                    objects["tables"] = [r[0] for r in rows]

                elif obj == "views":
                    cursor.execute("SELECT table_name FROM information_schema.views WHERE table_schema='public';")
                    rows = cursor.fetchall()
                    objects["views"] = [r[0] for r in rows]

                elif obj == "functions":
                    cursor.execute("SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_type='FUNCTION';")
                    rows = cursor.fetchall()
                    objects["functions"] = [r[0] for r in rows]

                elif obj == "sequences":
                    cursor.execute("SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public';")
                    rows = cursor.fetchall()
                    objects["sequences"] = [r[0] for r in rows]

                elif obj == "indexes":
                    cursor.execute("SELECT indexname FROM pg_indexes WHERE schemaname = 'public';")
                    rows = cursor.fetchall()
                    objects["indexes"] = [r[0] for r in rows]

                elif obj == "constraints":
                    cursor.execute("""
                        SELECT conname FROM pg_constraint c
                        JOIN pg_namespace n ON n.oid = c.connamespace
                        WHERE n.nspname = 'public'
                    """)
                    rows = cursor.fetchall()
                    objects["constraints"] = [r[0] for r in rows]

                elif obj == "triggers":
                    cursor.execute("""
                        SELECT tgname FROM pg_trigger t
                        JOIN pg_class c ON t.tgrelid = c.oid
                        JOIN pg_namespace n ON c.relnamespace = n.oid
                        WHERE n.nspname = 'public' AND NOT t.tgisinternal
                    """)
                    rows = cursor.fetchall()
                    objects["triggers"] = [r[0] for r in rows]
                    
                elif obj == "materialized_views":
                    cursor.execute("SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';")
                    rows = cursor.fetchall()
                    objects["materialized_views"] = [r[0] for r in rows]
                    
                elif obj == "procedures":
                    cursor.execute("SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_type='PROCEDURE';")
                    rows = cursor.fetchall()
                    objects["procedures"] = [r[0] for r in rows]
                    
                elif obj == "schemas":
                    cursor.execute("""
                        SELECT nspname FROM pg_namespace
                        WHERE nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
                        AND nspname NOT LIKE 'pg_temp_%' AND nspname NOT LIKE 'pg_toast_temp_%'
                    """)
                    rows = cursor.fetchall()
                    objects["schemas"] = [r[0] for r in rows]

        finally:
            conn.close()
            
        return objects

    def _fetch_mysql_objects(self, conn_str: str, object_types: List[str]) -> Dict[str, List[str]]:
        """Fetch MySQL objects."""
        try:
            import mysql.connector
        except ImportError:
            raise Exception("mysql-connector-python library required for MySQL. Install with: pip install mysql-connector-python")
            
        parsed = urlparse(conn_str)
        database_name = parsed.path[1:]  # Remove leading slash

        conn = mysql.connector.connect(
            host=parsed.hostname,
            port=parsed.port,
            database=database_name,
            user=parsed.username,
            password=parsed.password
        )
        
        cursor = conn.cursor()
        objects = {}

        try:
            # Query MySQL-specific object types
            for obj in object_types:
                if obj == "tables":
                    cursor.execute(f"SELECT table_name FROM information_schema.tables WHERE table_schema='{database_name}' AND table_type='BASE TABLE';")
                    rows = cursor.fetchall()
                    objects["tables"] = [r[0] for r in rows]

                elif obj == "views":
                    cursor.execute(f"SELECT table_name FROM information_schema.views WHERE table_schema='{database_name}';")
                    rows = cursor.fetchall()
                    objects["views"] = [r[0] for r in rows]

                elif obj == "functions":
                    cursor.execute(f"SELECT routine_name FROM information_schema.routines WHERE routine_schema='{database_name}' AND routine_type='FUNCTION';")
                    rows = cursor.fetchall()
                    objects["functions"] = [r[0] for r in rows]

                elif obj == "procedures":
                    cursor.execute(f"SELECT routine_name FROM information_schema.routines WHERE routine_schema='{database_name}' AND routine_type='PROCEDURE';")
                    rows = cursor.fetchall()
                    objects["procedures"] = [r[0] for r in rows]

                elif obj == "triggers":
                    cursor.execute(f"SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema='{database_name}';")
                    rows = cursor.fetchall()
                    objects["triggers"] = [r[0] for r in rows]

                elif obj == "indexes":
                    cursor.execute(f"SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema='{database_name}' AND index_name != 'PRIMARY';")
                    rows = cursor.fetchall()
                    objects["indexes"] = [r[0] for r in rows]
                
                elif obj == "constraints":
                    cursor.execute(f"SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema='{database_name}' AND constraint_type='FOREIGN KEY';")
                    rows = cursor.fetchall()
                    objects["constraints"] = [r[0] for r in rows]

        finally:
            conn.close()
            
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
                definitions["definitions"] = self._get_postgresql_definitions(conn_str, selected_objects)
            elif database_type.lower() == "mysql":
                definitions["definitions"] = self._get_mysql_definitions(conn_str, selected_objects)
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

    def _generate_postgresql_create_table(self, table_name: str, columns: List[Dict], cursor) -> str:
        """Generate CREATE TABLE statement for PostgreSQL."""
        try:
            # Get primary keys
            cursor.execute("""
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                WHERE i.indrelid = %s::regclass AND i.indisprimary
            """, (f"public.{table_name}",))
            
            primary_keys = [row[0] for row in cursor.fetchall()]
            
            # Build CREATE TABLE statement
            create_lines = [f"CREATE TABLE {table_name} ("]
            
            for i, col in enumerate(columns):
                line = f"    {col['name']} {col['type']}"
                
                if not col['nullable']:
                    line += " NOT NULL"
                
                if col['default']:
                    line += f" DEFAULT {col['default']}"
                
                if col['name'] in primary_keys:
                    line += " PRIMARY KEY"
                
                if i < len(columns) - 1:
                    line += ","
                
                create_lines.append(line)
            
            create_lines.append(");")
            return "\n".join(create_lines)
            
        except Exception as e:
            return f"-- Error generating CREATE TABLE statement: {e}"

    def _generate_mysql_create_table(self, table_name: str, columns: List[Dict], cursor, database_name: str) -> str:
        """Generate CREATE TABLE statement for MySQL."""
        try:
            # Get primary keys
            cursor.execute(f"""
                SELECT column_name
                FROM information_schema.key_column_usage
                WHERE table_schema = '{database_name}' AND table_name = %s AND constraint_name = 'PRIMARY'
            """, (table_name,))
            
            primary_keys = [row[0] for row in cursor.fetchall()]
            
            # Build CREATE TABLE statement
            create_lines = [f"CREATE TABLE {table_name} ("]
            
            for i, col in enumerate(columns):
                line = f"    {col['name']} {col['type']}"
                
                if not col['nullable']:
                    line += " NOT NULL"
                
                if col['default']:
                    line += f" DEFAULT {col['default']}"
                
                if col['name'] in primary_keys:
                    line += " PRIMARY KEY"
                
                if i < len(columns) - 1:
                    line += ","
                
                create_lines.append(line)
            
            create_lines.append(");")
            return "\n".join(create_lines)
            
        except Exception as e:
            return f"-- Error generating CREATE TABLE statement: {e}"

    def _get_postgresql_definitions(self, conn_str: str, selected_objects: Dict[str, List[str]]) -> Dict[str, List[Dict]]:
        """Get detailed PostgreSQL object definitions with CREATE statements."""
        conn = psycopg2.connect(conn_str)
        cursor = conn.cursor()
        definitions = {}

        try:
            # Process tables with CREATE TABLE statements
            if "tables" in selected_objects and selected_objects["tables"]:
                definitions["tables"] = []
                for table_name in selected_objects["tables"]:
                    # Get column information
                    cursor.execute("""
                        SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                        FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = %s
                        ORDER BY ordinal_position
                    """, (table_name,))

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

                    # Generate CREATE TABLE statement
                    create_statement = self._generate_postgresql_create_table(table_name, columns, cursor)

                    definitions["tables"].append({
                        "name": table_name, 
                        "columns": columns,
                        "definition": create_statement
                    })

            # Process views with CREATE VIEW statements
            if "views" in selected_objects and selected_objects["views"]:
                definitions["views"] = []
                for view_name in selected_objects["views"]:
                    cursor.execute("""
                        SELECT table_name, view_definition
                        FROM information_schema.views
                        WHERE table_schema = 'public' AND table_name = %s
                    """, (view_name,))

                    result = cursor.fetchone()
                    if result:
                        name, view_def = result
                        create_statement = f"CREATE VIEW {name} AS\n{view_def}"
                        definitions["views"].append({
                            "name": name, 
                            "definition": create_statement,
                            # "view_definition": view_def
                        })
                    else:
                        definitions["views"].append({
                            "name": view_name, 
                            "definition": "-- Definition not available"
                        })

            # Process functions (existing logic)
            if "functions" in selected_objects and selected_objects["functions"]:
                definitions["functions"] = []
                for function_name in selected_objects["functions"]:
                    cursor.execute("""
                        SELECT p.proname as name, pg_catalog.pg_get_function_arguments(p.oid) as arguments,
                               pg_catalog.pg_get_function_result(p.oid) as return_type, p.prosrc as source
                        FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
                        WHERE n.nspname = 'public' AND p.proname = %s
                    """, (function_name,))

                    result = cursor.fetchone()
                    if result:
                        name, arguments, return_type, source = result
                        definitions["functions"].append({
                            "name": name, 
                            "arguments": arguments, 
                            "return_type": return_type, 
                            "source": source
                        })
                    else:
                        definitions["functions"].append({
                            "name": function_name, 
                            "source": "-- Definition not available"
                        })

            # Process Constraints (existing logic)
            if "constraints" in selected_objects and selected_objects["constraints"]:   
                definitions["constraints"] = []
                for constraint_name in selected_objects["constraints"]:
                    cursor.execute("""
                        SELECT conname, pg_catalog.pg_get_constraintdef(c.oid) as definition
                        FROM pg_constraint c JOIN pg_namespace n ON c.connamespace = n.oid
                        WHERE n.nspname = 'public' AND conname = %s
                    """, (constraint_name,))

                    result = cursor.fetchone()
                    if result:
                        name, definition = result
                        definitions["constraints"].append({"name": name, "definition": definition})
                    else:
                        definitions["constraints"].append({"name": constraint_name, "definition": "-- Definition not available"})
            
            # Process Indexes (existing logic)
            if "indexes" in selected_objects and selected_objects["indexes"]:
                definitions["indexes"] = []
                for index_name in selected_objects["indexes"]:
                    cursor.execute("""
                        SELECT indexname, indexdef
                        FROM pg_indexes
                        WHERE schemaname = 'public' AND indexname = %s
                    """, (index_name,))

                    result = cursor.fetchone()
                    if result:
                        name, definition = result
                        definitions["indexes"].append({"name": name, "definition": definition})
                    else:
                        definitions["indexes"].append({"name": index_name, "definition": "-- Definition not available"})
            
            # Process Procedures (existing logic)
            if "procedures" in selected_objects and selected_objects["procedures"]:
                definitions["procedures"] = []
                for procedure_name in selected_objects["procedures"]:
                    cursor.execute("""
                        SELECT p.proname as name, pg_catalog.pg_get_function_arguments(p.oid) as arguments,
                               pg_catalog.pg_get_function_result(p.oid) as return_type, p.prosrc as source
                        FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
                        WHERE n.nspname = 'public' AND p.proname = %s AND p.prokind = 'p'
                    """, (procedure_name,))

                    result = cursor.fetchone()
                    if result:
                        name, arguments, return_type, source = result
                        definitions["procedures"].append({
                            "name": name, 
                            "arguments": arguments, 
                            "return_type": return_type, 
                            "source": source
                        })
                    else:
                        definitions["procedures"].append({
                            "name": procedure_name, 
                            "source": "-- Definition not available"
                        })
            
            # Process Triggers (existing logic)
            if "triggers" in selected_objects and selected_objects["triggers"]:
                definitions["triggers"] = []
                for trigger_name in selected_objects["triggers"]:
                    cursor.execute("""
                        SELECT tgname, pg_catalog.pg_get_triggerdef(t.oid) as definition
                        FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
                        JOIN pg_namespace n ON c.relnamespace = n.oid
                        WHERE n.nspname = 'public' AND tgname = %s AND NOT t.tgisinternal
                    """, (trigger_name,))

                    result = cursor.fetchone()
                    if result:
                        name, definition = result
                        definitions["triggers"].append({"name": name, "definition": definition})
                    else:
                        definitions["triggers"].append({"name": trigger_name, "definition": "-- Definition not available"})
            
            # Process Materialized Views (existing logic)
            if "materialized_views" in selected_objects and selected_objects["materialized_views"]:
                definitions["materialized_views"] = []
                for mv_name in selected_objects["materialized_views"]:
                    cursor.execute("""
                        SELECT matviewname, pg_catalog.pg_get_viewdef(m.oid, true) as definition
                        FROM pg_matviews m JOIN pg_namespace n ON m.schemaname = n.nspname
                        WHERE n.nspname = 'public' AND matviewname = %s
                    """, (mv_name,))

                    result = cursor.fetchone()
                    if result:
                        name, definition = result
                        create_statement = f"CREATE MATERIALIZED VIEW {name} AS\n{definition}"
                        definitions["materialized_views"].append({
                            "name": name, 
                            "definition": create_statement,
                            # "view_definition": definition
                        })
                    else:
                        definitions["materialized_views"].append({
                            "name": mv_name, 
                            "definition": "-- Definition not available"
                        })
            
            # Process Schemas (existing logic)
            if "schemas" in selected_objects and selected_objects["schemas"]:
                definitions["schemas"] = []
                for schema_name in selected_objects["schemas"]:
                    cursor.execute("""
                        SELECT nspname, pg_catalog.pg_get_userbyid(nspowner) as owner
                        FROM pg_namespace
                        WHERE nspname = %s AND nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
                    """, (schema_name,))

                    result = cursor.fetchone()
                    if result:
                        name, owner = result
                        definitions["schemas"].append({"name": name, "owner": owner})
                    else:
                        definitions["schemas"].append({"name": schema_name, "owner": "-- Definition not available"})   

            # Process Sequences (existing logic)
            if "sequences" in selected_objects and selected_objects["sequences"]:
                definitions["sequences"] = []
                for sequence_name in selected_objects["sequences"]:
                    cursor.execute("""
                        SELECT sequence_name, data_type, increment_by, min_value, max_value, start_value, cycle_option
                        FROM information_schema.sequences
                        WHERE sequence_schema = 'public' AND sequence_name = %s
                    """, (sequence_name,))

                    result = cursor.fetchone()
                    if result:
                        name, data_type, increment_by, min_value, max_value, start_value, cycle_option = result
                        definitions["sequences"].append({
                            "name": name,
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

    def _get_mysql_definitions(self, conn_str: str, selected_objects: Dict[str, List[str]]) -> Dict[str, List[Dict]]:
        """Get detailed MySQL object definitions with CREATE statements."""
        try:
            import mysql.connector
        except ImportError:
            raise Exception("mysql-connector-python library required for MySQL")
            
        parsed = urlparse(conn_str)
        database_name = parsed.path[1:]

        conn = mysql.connector.connect(
            host=parsed.hostname,
            port=parsed.port,
            database=database_name,
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
                    cursor.execute(f"""
                        SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                        FROM information_schema.columns
                        WHERE table_schema = '{database_name}' AND table_name = %s
                        ORDER BY ordinal_position
                    """, (table_name,))

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
                    create_statement = self._generate_mysql_create_table(table_name, columns, cursor, database_name)

                    definitions["tables"].append({
                        "name": table_name, 
                        "columns": columns,
                        "definition": create_statement
                    })

            # Process MySQL views with CREATE VIEW statements
            if "views" in selected_objects and selected_objects["views"]:
                definitions["views"] = []
                for view_name in selected_objects["views"]:
                    cursor.execute(f"""
                        SELECT table_name, view_definition
                        FROM information_schema.views
                        WHERE table_schema = '{database_name}' AND table_name = %s
                    """, (view_name,))

                    result = cursor.fetchone()
                    if result:
                        name, view_def = result
                        create_statement = f"CREATE VIEW {name} AS\n{view_def}"
                        definitions["views"].append({
                            "name": name, 
                            "definition": create_statement,
                            # "view_definition": view_def
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
                    cursor.execute(f"""
                        SELECT routine_name, routine_definition, data_type as return_type
                        FROM information_schema.routines
                        WHERE routine_schema = '{database_name}' AND routine_name = %s AND routine_type = 'FUNCTION'
                    """, (function_name,))

                    result = cursor.fetchone()
                    if result:
                        name, definition, return_type = result
                        definitions["functions"].append({"name": name, "definition": definition, "return_type": return_type})
                    else:
                        definitions["functions"].append({"name": function_name, "definition": "-- Definition not available"})

            # Process Indexes
            if "indexes" in selected_objects and selected_objects["indexes"]:
                definitions["indexes"] = []
                for index_name in selected_objects["indexes"]:
                    cursor.execute(f"""
                        SELECT index_name, group_concat(column_name ORDER BY seq_in_index) as columns
                        FROM information_schema.statistics
                        WHERE table_schema = '{database_name}' AND index_name = %s
                        GROUP BY index_name
                    """, (index_name,))

                    result = cursor.fetchone()
                    if result:
                        name, columns = result
                        definitions["indexes"].append({"name": name, "columns": columns.split(",")})
                    else:
                        definitions["indexes"].append({"name": index_name, "definition": "-- Definition not available"})
            
            # Process MySQL Constraints
            if "constraints" in selected_objects and selected_objects["constraints"]:
                definitions["constraints"] = []
                for constraint_name in selected_objects["constraints"]:
                    cursor.execute(f"""
                        SELECT constraint_name, column_name, referenced_table_name, referenced_column_name
                        FROM information_schema.key_column_usage
                        WHERE table_schema = '{database_name}' AND constraint_name = %s
                    """, (constraint_name,))

                    rows = cursor.fetchall()
                    if rows:
                        for row in rows:
                            name, column, ref_table, ref_column = row
                            definitions["constraints"].append({
                                "name": name,
                                "column": column,
                                "referenced_table": ref_table,
                                "referenced_column": ref_column
                            })
                    else:
                        definitions["constraints"].append({"name": constraint_name, "definition": "-- Definition not available"})
            
            # Process MySQL Procedures
            if "procedures" in selected_objects and selected_objects["procedures"]:
                definitions["procedures"] = []
                for procedure_name in selected_objects["procedures"]:
                    cursor.execute(f"""
                        SELECT routine_name, routine_definition, data_type as return_type
                        FROM information_schema.routines
                        WHERE routine_schema = '{database_name}' AND routine_name = %s AND routine_type = 'PROCEDURE'
                    """, (procedure_name,))

                    result = cursor.fetchone()
                    if result:
                        name, definition, return_type = result
                        definitions["procedures"].append({"name": name, "definition": definition, "return_type": return_type})
                    else:
                        definitions["procedures"].append({"name": procedure_name, "definition": "-- Definition not available"})

            # Process MySQL Triggers
            if "triggers" in selected_objects and selected_objects["triggers"]:
                definitions["triggers"] = []
                for trigger_name in selected_objects["triggers"]:
                    cursor.execute(f"""
                        SELECT trigger_name, action_statement
                        FROM information_schema.triggers
                        WHERE trigger_schema = '{database_name}' AND trigger_name = %s
                    """, (trigger_name,))

                    result = cursor.fetchone()
                    if result:
                        name, definition = result
                        definitions["triggers"].append({"name": name, "definition": definition})
                    else:
                        definitions["triggers"].append({"name": trigger_name, "definition": "-- Definition not available"})

        finally:
            conn.close()
            
        return definitions