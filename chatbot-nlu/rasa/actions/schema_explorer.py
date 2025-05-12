import re
import json
import tempfile
import psycopg2
from typing import Any, Text, Dict, List

from rasa_sdk import Action, FormValidationAction, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
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

    # def validate_object_types(
    #     self,
    #     slot_value: Any,
    #     dispatcher: CollectingDispatcher,
    #     tracker: Tracker,
    #     domain: DomainDict,
    # ) -> Dict[Text, Any]:
    #     """
    #     Validate that the object types provided are among the supported list.
    #     """
    #     supported = {"tables", "views", "functions", "sequences"}
    #     # Accept list from form if available
    #     if isinstance(slot_value, list):
    #         selected = [obj for obj in slot_value if obj in supported]
    #     else:
    #         # Normalize and split
    #         raw = re.split(r"[\s,]+", str(slot_value))
    #         normalized = [obj.strip().lower() for obj in raw if obj.strip()]
    #         selected = [obj for obj in normalized if obj in supported]

    #     if selected:
    #         return {"object_types": selected}

    #     dispatcher.utter_message(text="Please choose valid object types: tables, views, functions or sequences.")
    #     return {"object_types": None}

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
        supported = {"tables", "views", "functions", "sequences"}
        selected = []
    
        # Debug the input
        print(f"Input object_types value: {slot_value!r}")
    
        # Handle different input formats
        if isinstance(slot_value, list):
            # If it's a list with comma-separated strings inside
            for item in slot_value:
                if isinstance(item, str) and ',' in item:
                    # Split each comma-separated string
                    parts = [part.strip().lower() for part in item.split(',') if part.strip()]
                    selected.extend([part for part in parts if part in supported])
                else:
                    # Regular list item
                    if isinstance(item, str) and item.strip().lower() in supported:
                        selected.append(item.strip().lower())
        elif isinstance(slot_value, str):
            # If it's a string with commas
            if ',' in slot_value:
                parts = [part.strip().lower() for part in slot_value.split(',') if part.strip()]
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

        schema_data = {}
        try:
            conn = psycopg2.connect(conn_str)
            cursor = conn.cursor()
            for obj in object_types:
                if obj == "tables":
                    cursor.execute(
                        "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
                    )
                elif obj == "views":
                    cursor.execute(
                        "SELECT table_name FROM information_schema.views WHERE table_schema='public';"
                    )
                elif obj == "functions":
                    cursor.execute(
                        "SELECT routine_name FROM information_schema.routines WHERE routine_schema='public';"
                    )
                elif obj == "sequences":
                    cursor.execute(
                        "SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public';"
                    )
                rows = cursor.fetchall()
                schema_data[obj] = [r[0] for r in rows]
            conn.close()
        except Exception as e:
            dispatcher.utter_message(text=f"Error fetching schema: {e}")
            return []

        # Write results to a temporary JSON file
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
        tmp.write(json.dumps(schema_data, indent=2).encode("utf-8"))
        tmp.flush()
        tmp.close()

        # Save the file path into a slot
        return [SlotSet("schema_file_path", tmp.name)]


class ActionDownloadSchema(Action):
    def name(self) -> Text:
        return "action_download_schema"

    async def run(
        self, 
        dispatcher: CollectingDispatcher, 
        tracker: Tracker, 
        domain: DomainDict
    ) -> List[Dict[Text, Any]]:
        file_path = tracker.get_slot("schema_file_path")
        if not file_path:
            dispatcher.utter_message(text="Sorry, I don't have any schema file to download yet.")
            return []
        
        # In Rasa, you can return a file link directly:
        link = f"sandbox:{file_path}"
        dispatcher.utter_message(text=f"Here's your schema JSON. You can download it here:\n{link}")
        return []