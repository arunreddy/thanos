# This files contains your custom actions which can be used to run
# custom Python code.
#
# See this guide on how to implement these action:
# https://rasa.com/docs/rasa/custom-actions


from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
import logging
import random
from rasa_sdk.events import Restarted

logger = logging.getLogger(__name__)

class ActionRecommendDatabase(Action):
    def name(self) -> Text:
        return "action_recommend_database"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        try:
            # Retrieve slot values
            app_type = tracker.get_slot("app_type")
            feature_type = tracker.get_slot("feature_type")
            relationship_type = tracker.get_slot("relationship_type")
            downtime_tolerance = tracker.get_slot("downtime_tolerance")

            logger.info(f"Slots received: app_type={app_type}, feature_type={feature_type}, "
                        f"relationship_type={relationship_type}, downtime_tolerance={downtime_tolerance}")

            # Determine characteristics
            is_structured = "Structured" in app_type if app_type else False
            is_oracle_only = feature_type == "Yes, Oracle-only"
            is_single_key = relationship_type == "Single-key access only"
            is_complex = relationship_type == "Complex relationships or relational schema"
            can_handle_downtime = downtime_tolerance == "Yes"

            # Determine initial recommendation based on slots
            if is_oracle_only:
                recommended_db = "Oracle"
            elif is_structured:
                if is_single_key:
                    recommended_db = "MySQL or PostgreSQL"
                elif is_complex:
                    recommended_db = "PostgreSQL or SQL Server (if Tier 1)"
                else:
                    recommended_db = "PostgreSQL"
            else:  # Unstructured data
                if is_complex:
                    recommended_db = "Neo4j"
                else:
                    recommended_db = "MongoDB"

            # Adjust recommendation based on downtime tolerance
            if not can_handle_downtime:
                recommended_db = f"Multi-AZ Deployment ({recommended_db})"
            elif can_handle_downtime and not is_oracle_only:
                recommended_db = f"Single Instance with Snapshot ({recommended_db})"

            # Calculate estimated cost using a direct lookup
            base_costs = {
                "Oracle": 500,
                "MySQL": 200,
                "PostgreSQL": 250,
                "MongoDB": 300,
                "Neo4j": 400,
                "SQL Server": 450
            }

            # Extract the base database name (text before any parenthesis)
            base_db = recommended_db.split("(")[0].strip()
            cost = base_costs.get(base_db, 0)
            if "Multi-AZ" in recommended_db:
                cost *= 1.75
                

            estimated_cost = f"${cost:.2f} per month"
            logger.info(f"Recommendation: {recommended_db}, Estimated cost: {estimated_cost}")

            return [SlotSet("recommended_database", recommended_db),
                    SlotSet("estimated_cost", estimated_cost)]
        except Exception as e:
            logger.error(f"Error in action_recommend_database: {e}", exc_info=True)
            dispatcher.utter_message("Sorry, an error occurred while processing your request.")
            return []

class ActionSubmitRequest(Action):
    def name(self) -> Text:
        return "action_submit_request"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        # Retrieve slots
        app_type = tracker.get_slot("app_type")
        feature_type = tracker.get_slot("feature_type")
        relationship_type = tracker.get_slot("relationship_type")
        downtime_tolerance = tracker.get_slot("downtime_tolerance")
        recommended_database = tracker.get_slot("recommended_database")
        estimated_cost = tracker.get_slot("estimated_cost")

        # Simulate Jira ticket creation
        ticket_id = f"DB-{random.randint(1000, 9999)}"
        dispatcher.utter_message(
            f"Your database request has been submitted. Jira ticket {ticket_id} has been created and assigned to the appropriate approver. You will receive notifications about the status of your request."
        )
        return []


class ActionRestart(Action):
    def name(self) -> Text:
        return "action_restart"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message("Let's start over with the database selection process.")
        return [Restarted()]

class ActionProcessObjectList(Action):
    def name(self) -> Text:
        return "action_process_object_list"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        # Retrieve slots
        host = tracker.get_slot("database_host_endpoint")
        db_type = tracker.get_slot("database_type")
        objects = tracker.get_slot("object_types")
        
        # Here, process the request and create a JSON output as per your format.
        json_output = {
            "comments": "Review the object lists and keep only the required objects",
            "database_host_endpoint": host,
            "objects": {
                "tables": ["users", "orders", "products"] if "Tables" in objects else [],
                "views": ["active_users", "inactive_users"] if "Views" in objects else [],
                "indexes": ["users_username_idx", "orders_date_idx"] if "Indexes" in objects else [],
                "constraints": ["users_pk", "orders_user_fk"] if "Constraints" in objects else []
            }
        }
        
        dispatcher.utter_message(text=f"JSON Output:\n{json_output}")
        return []

class ActionExportDefinition(Action):
    def name(self) -> Text:
        return "action_export_definition"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        host = tracker.get_slot("database_host_endpoint")
        # Process and generate export definition JSON output
        json_output = {
            "database_host_endpoint": host,
            "definitions": {
                "tables": [
                    {
                        "name": "users",
                        "columns": [
                            {"name": "id", "type": "int", "nullable": False},
                            {"name": "username", "type": "varchar(255)", "nullable": False},
                            {"name": "email", "type": "varchar(255)", "nullable": False}
                        ]
                    }
                ],
                "views": [
                    {
                        "name": "active_users",
                        "query": "SELECT id, username, email FROM users WHERE active = true"
                    }
                ],
                "indexes": [
                    {
                        "name": "users_username_idx",
                        "columns": ["username"],
                        "type": "unique"
                    }
                ],
                "constraints": [
                    {
                        "type": "PRIMARY KEY",
                        "table": "users",
                        "columns": ["id"]
                    }
                ]
            }
        }
        
        dispatcher.utter_message(text=f"Export JSON Output:\n{json_output}")
        return []
    
class ActionValidateTemplate(Action):
    def name(self) -> Text:
        return "action_validate_template"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        # Retrieve user's message or file info
        user_input = tracker.latest_message.get("text", "")
        # For demo, let's say 'template' in text => valid
        if "template" in user_input.lower():
            return [SlotSet("template_valid", True)]
        else:
            return [SlotSet("template_valid", False)]
