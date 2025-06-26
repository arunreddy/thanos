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
        Validate that the connection string is a proper Postgres URI.
        """
        pattern = r"^postgres:\/\/[^:]+:[^@]+@[^:]+:\d+\/[\w\-]+$"
        if isinstance(slot_value, str) and re.match(pattern, slot_value):
            return {"connection_string": slot_value}
        dispatcher.utter_message(response="utter_invalid_connection_string")
        return {"connection_string": None}

    def validate_object_types(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        """
        Validate that the object types provided are among the supported list.
        """
        supported = {"tables", "views", "functions", "sequences", "indexes", "constraints", "triggers", "materialized_views", "procedures", "schemas"}
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

        dispatcher.utter_message(text="Please choose valid object types: tables, views, functions or sequences. Separate multiple types with spaces.")
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
        conn_str = tracker.get_slot("connection_string")
        object_types = tracker.get_slot("object_types") or []

        print(f"ActionSubmitSchemaExplore#Object types: {object_types}")

        # Ensure object_types is a list
        if isinstance(object_types, str):
            if "," in object_types:
                object_types = [obj.strip() for obj in object_types.split(",") if obj.strip()]
            else:
                object_types = [object_types]

        # Parse the connection string to get host and port
        host_port = "unknown"
        if conn_str:
            # Extract host:port from postgres://user:pass@host:port/dbname
            import re

            match = re.search(r"@([^/]+)/", conn_str)
            if match:
                host_port = match.group(1)
        events = []
        events.append(SlotSet("database_host_endpoint", host_port))
        # Initialize the output structure
        schema_data = {"comments": "Review the object lists and keep only the required objects", "database_host_endpoint": host_port, "objects": {}}

        try:
            conn = psycopg2.connect(conn_str)
            cursor = conn.cursor()

            # Only query the specifically requested object types
            for obj in object_types:
                if obj == "tables":
                    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
                    rows = cursor.fetchall()
                    schema_data["objects"]["tables"] = [r[0] for r in rows]

                elif obj == "views":
                    cursor.execute("SELECT table_name FROM information_schema.views WHERE table_schema='public';")
                    rows = cursor.fetchall()
                    schema_data["objects"]["views"] = [r[0] for r in rows]

                elif obj == "functions":
                    cursor.execute("SELECT routine_name FROM information_schema.routines WHERE routine_schema='public';")
                    rows = cursor.fetchall()
                    schema_data["objects"]["functions"] = [r[0] for r in rows]

                elif obj == "sequences":
                    cursor.execute("SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public';")
                    rows = cursor.fetchall()
                    schema_data["objects"]["sequences"] = [r[0] for r in rows]

                elif obj == "indexes":
                    cursor.execute("""
                        SELECT indexname FROM pg_indexes 
                        WHERE schemaname = 'public'
                    """)
                    rows = cursor.fetchall()
                    schema_data["objects"]["indexes"] = [r[0] for r in rows]

                elif obj == "constraints":
                    cursor.execute("""
                        SELECT conname FROM pg_constraint c
                        JOIN pg_namespace n ON n.oid = c.connamespace
                        WHERE n.nspname = 'public'
                    """)
                    rows = cursor.fetchall()
                    schema_data["objects"]["constraints"] = [r[0] for r in rows]

                elif obj == "triggers":
                    cursor.execute("""
                        SELECT tgname FROM pg_trigger t
                        JOIN pg_namespace n ON n.oid = t.tgrelid
                        WHERE n.nspname = 'public'
                    """)
                    rows = cursor.fetchall()
                    schema_data["objects"]["triggers"] = [r[0] for r in rows]
                elif obj == "materialized_views":
                    cursor.execute("""
                        SELECT matviewname FROM pg_matviews m
                        JOIN pg_namespace n ON n.oid = m.schemaname
                        WHERE n.nspname = 'public'
                    """)
                    rows = cursor.fetchall()
                    schema_data["objects"]["materialized_views"] = [r[0] for r in rows]
                elif obj == "procedures":
                    cursor.execute("""
                        SELECT proname FROM pg_proc p
                        JOIN pg_namespace n ON n.oid = p.pronamespace
                        WHERE n.nspname = 'public'
                    """)
                    rows = cursor.fetchall()
                    schema_data["objects"]["procedures"] = [r[0] for r in rows]
                elif obj == "schemas":
                    cursor.execute("""
                        SELECT nspname FROM pg_namespace
                        WHERE nspname NOT IN ('information_schema', 'pg_catalog')
                    """)
                    rows = cursor.fetchall()
                    schema_data["objects"]["schemas"] = [r[0] for r in rows]

            conn.close()

            # Convert schema data to JSON string
            schema_json = json.dumps(schema_data, indent=4)

            # Step 1: Store available objects in dedicated slot
            return [SlotSet("database_host_endpoint", host_port), SlotSet("available_objects", schema_data["objects"]), SlotSet("schema_file_path", schema_json)]

        except Exception as e:
            dispatcher.utter_message(text=f"Error fetching schema: {e}")
            return []


class ActionFetchAvailableObjects(Action):
    def name(self) -> Text:
        return "action_fetch_available_objects"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: DomainDict) -> List[Dict[Text, Any]]:
        # Get available objects from slot
        available_objects = tracker.get_slot("available_objects")

        print(f"ActionFetchAvailableObjects#Available objects: {available_objects}")

        if not available_objects:
            dispatcher.utter_message(text="Sorry, I don't have any schema information yet.")
            return []

        # Display the JSON content directly
        form_message = {
            "text": "Select the objects for which you want detailed definitions",
            "form_type": "multiselect",
            "objects": available_objects,
        }
        try:
            dispatcher.utter_message(custom=form_message)
        except Exception as e:
            dispatcher.utter_message(text=f"Error displaying schema: {e}")

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

        print(f"ActionFetchObjectDefinitions#Last message: {last_message}")

        try:
            # Try to extract and parse the JSON from the message
            import json
            import re

            schema_selection = json.loads(last_message)

            # # Look for JSON pattern in the message
            # json_match = re.search(r"\{.*\}", last_message, re.DOTALL)
            # if not json_match:
            #     dispatcher.utter_message(text="I couldn't find a valid JSON object in your message. Please provide your selection as JSON.")
            #     return []

            # json_str = json_match.group(0)
            # schema_selection = json.loads(json_str)

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
            host_endpoint = tracker.get_slot("database_host_endpoint")
            if not host_endpoint:
                # Try to extract from connection string
                match = re.search(r"@([^/]+)/", conn_str)
                if match:
                    host_endpoint = match.group(1)
                else:
                    host_endpoint = "unknown"

            # Initialize definitions structure
            definitions = {"database_host_endpoint": host_endpoint, "definitions": {}}

            # Connect to database
            import psycopg2

            conn = psycopg2.connect(conn_str)
            cursor = conn.cursor()

            # Process tables
            if "tables" in selected_objects and selected_objects["tables"]:
                definitions["definitions"]["tables"] = []

                for table_name in selected_objects["tables"]:
                    # Get column details
                    cursor.execute(
                        """
                        SELECT 
                            column_name, 
                            data_type, 
                            character_maximum_length,
                            is_nullable
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = %s
                        ORDER BY ordinal_position
                    """,
                        (table_name,),
                    )

                    columns = []
                    for col in cursor.fetchall():
                        col_name, col_type, max_length, nullable = col

                        # Format type with length if applicable
                        if max_length:
                            col_type = f"{col_type}({max_length})"

                        columns.append({"name": col_name, "type": col_type, "nullable": nullable.lower() == "yes"})

                    definitions["definitions"]["tables"].append({"name": table_name, "columns": columns})

            # Process functions
            if "functions" in selected_objects and selected_objects["functions"]:
                definitions["definitions"]["functions"] = []

                for function_name in selected_objects["functions"]:
                    # Get function details
                    cursor.execute(
                        """
                        SELECT 
                            p.proname as name,
                            pg_catalog.pg_get_function_arguments(p.oid) as arguments,
                            pg_catalog.pg_get_function_result(p.oid) as return_type,
                            p.prosrc as source
                        FROM pg_proc p
                        JOIN pg_namespace n ON p.pronamespace = n.oid
                        WHERE n.nspname = 'public'
                          AND p.proname = %s
                    """,
                        (function_name,),
                    )

                    result = cursor.fetchone()
                    if result:
                        name, arguments, return_type, source = result

                        definitions["definitions"]["functions"].append({"name": name, "arguments": arguments, "return_type": return_type, "source": source})
                    else:
                        definitions["definitions"]["functions"].append({"name": function_name, "source": "-- Definition not available"})

            # Process views (if requested)
            if "views" in selected_objects and selected_objects["views"]:
                definitions["definitions"]["views"] = []
                for view_name in selected_objects["views"]:
                    # Get view details
                    cursor.execute(
                        """
                        SELECT 
                            column_name, 
                            data_type, 
                            character_maximum_length,
                            is_nullable
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = %s
                        ORDER BY ordinal_position
                    """,
                        (view_name,),
                    )

                    columns = []
                    for col in cursor.fetchall():
                        col_name, col_type, max_length, nullable = col

                        # Format type with length if applicable
                        if max_length:
                            col_type = f"{col_type}({max_length})"

                        columns.append({"name": col_name, "type": col_type, "nullable": nullable.lower() == "yes"})

                    definitions["definitions"]["views"].append({"name": view_name, "columns": columns})
            # Process sequences (if requested)
            if "sequences" in selected_objects and selected_objects["sequences"]:
                definitions["definitions"]["sequences"] = []
                for sequence_name in selected_objects["sequences"]:
                    # Get sequence details
                    cursor.execute(
                        """
                        SELECT 
                            c.relname as name,
                            pg_catalog.pg_get_serial_sequence(c.relname, a.attname) as sequence_name,
                            a.attname as column_name
                        FROM pg_class c
                        JOIN pg_attribute a ON a.attrelid = c.oid
                        WHERE c.relkind = 'S'
                          AND c.relname = %s
                    """,
                        (sequence_name,),
                    )

                    result = cursor.fetchone()
                    if result:
                        name, sequence_name, column_name = result

                        definitions["definitions"]["sequences"].append({"name": name, "sequence_name": sequence_name, "column_name": column_name})
                    else:
                        definitions["definitions"]["sequences"].append({"name": sequence_name, "source": "-- Definition not available"})

            # Process indexes (if requested)
            if "indexes" in selected_objects and selected_objects["indexes"]:
                definitions["definitions"]["indexes"] = []
                for index_name in selected_objects["indexes"]:
                    # Get index details
                    cursor.execute(
                        """
                        SELECT 
                            indexname, 
                            indexdef
                        FROM pg_indexes
                        WHERE schemaname = 'public'
                          AND indexname = %s
                    """,
                        (index_name,),
                    )

                    result = cursor.fetchone()
                    if result:
                        index_name, index_def = result

                        definitions["definitions"]["indexes"].append({"name": index_name, "definition": index_def})
                    else:
                        definitions["definitions"]["indexes"].append({"name": index_name, "source": "-- Definition not available"})
            # Process constraints (if requested)
            if "constraints" in selected_objects and selected_objects["constraints"]:
                definitions["definitions"]["constraints"] = []
                for constraint_name in selected_objects["constraints"]:
                    # Get constraint details
                    cursor.execute(
                        """
                        SELECT 
                            conname, 
                            pg_catalog.pg_get_constraintdef(c.oid) as definition
                        FROM pg_constraint c
                        JOIN pg_namespace n ON c.connamespace = n.oid
                        WHERE n.nspname = 'public'
                          AND conname = %s
                    """,
                        (constraint_name,),
                    )

                    result = cursor.fetchone()
                    if result:
                        con_name, definition = result

                        definitions["definitions"]["constraints"].append({"name": con_name, "definition": definition})
                    else:
                        definitions["definitions"]["constraints"].append({"name": constraint_name, "source": "-- Definition not available"})

            # Process triggers (if requested)
            if "triggers" in selected_objects and selected_objects["triggers"]:
                definitions["definitions"]["triggers"] = []
                for trigger_name in selected_objects["triggers"]:
                    # Get trigger details
                    cursor.execute(
                        """
                        SELECT 
                            tgname as name,
                            pg_catalog.pg_get_triggerdef(t.oid) as definition
                        FROM pg_trigger t
                        JOIN pg_namespace n ON t.tgrelid = n.oid
                        WHERE n.nspname = 'public'
                          AND tgname = %s
                    """,
                        (trigger_name,),
                    )

                    result = cursor.fetchone()
                    if result:
                        name, definition = result

                        definitions["definitions"]["triggers"].append({"name": name, "definition": definition})
                    else:
                        definitions["definitions"]["triggers"].append({"name": trigger_name, "source": "-- Definition not available"})
            # Process materialized views (if requested)
            if "materialized_views" in selected_objects and selected_objects["materialized_views"]:
                definitions["definitions"]["materialized_views"] = []
                for mv_name in selected_objects["materialized_views"]:
                    # Get materialized view details
                    cursor.execute(
                        """
                        SELECT 
                            matviewname as name,
                            pg_catalog.pg_get_viewdef(m.oid) as definition
                        FROM pg_matviews m
                        JOIN pg_namespace n ON m.schemaname = n.nspname
                        WHERE n.nspname = 'public'
                          AND matviewname = %s
                    """,
                        (mv_name,),
                    )

                    result = cursor.fetchone()
                    if result:
                        name, definition = result

                        definitions["definitions"]["materialized_views"].append({"name": name, "definition": definition})
                    else:
                        definitions["definitions"]["materialized_views"].append({"name": mv_name, "source": "-- Definition not available"})
            # Process procedures (if requested)
            if "procedures" in selected_objects and selected_objects["procedures"]:
                definitions["definitions"]["procedures"] = []
                for procedure_name in selected_objects["procedures"]:
                    # Get procedure details
                    cursor.execute(
                        """
                        SELECT 
                            proname as name,
                            pg_catalog.pg_get_function_result(p.oid) as return_type,
                            pg_catalog.pg_get_function_arguments(p.oid) as arguments,
                            p.prosrc as source
                        FROM pg_proc p
                        JOIN pg_namespace n ON p.pronamespace = n.oid
                        WHERE n.nspname = 'public'
                          AND proname = %s
                    """,
                        (procedure_name,),
                    )

                    result = cursor.fetchone()
                    if result:
                        name, return_type, arguments, source = result

                        definitions["definitions"]["procedures"].append({"name": name, "return_type": return_type, "arguments": arguments, "source": source})
                    else:
                        definitions["definitions"]["procedures"].append({"name": procedure_name, "source": "-- Definition not available"})
            # Process schemas (if requested)
            if "schemas" in selected_objects and selected_objects["schemas"]:
                definitions["definitions"]["schemas"] = []
                for schema_name in selected_objects["schemas"]:
                    # Get schema details
                    cursor.execute(
                        """
                        SELECT 
                            nspname as name,
                            pg_catalog.pg_get_userbyid(nspowner) as owner
                        FROM pg_namespace
                        WHERE nspname = %s
                    """,
                        (schema_name,),
                    )

                    result = cursor.fetchone()
                    if result:
                        name, owner = result

                        definitions["definitions"]["schemas"].append({"name": name, "owner": owner})
                    else:
                        definitions["definitions"]["schemas"].append({"name": schema_name, "source": "-- Definition not available"})
                # View processing similar to above...
                pass

            # Close database connection
            conn.close()

            # Generate a unique URL/path for the definitions
            import tempfile

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
                "file_name": f"object_definitions_{uuid.uuid4()}.json",
                "objects": definitions,
            }
            dispatcher.utter_message(custom=form_message)

            return events

        except Exception as e:
            dispatcher.utter_message(text=f"Error generating definitions: {e}")
            return []
