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
import re
import json

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
            downtime_tolerance = tracker.get_slot("downtime_tolerance") or "Yes"

            logger.info(f"Slots received: app_type={app_type}, feature_type={feature_type}, relationship_type={relationship_type}, downtime_tolerance={downtime_tolerance}")

            # Determine characteristics
            is_structured = "Structured" in app_type if app_type else False
            is_oracle_only = feature_type == "Yes, Oracle-only"
            is_single_key = relationship_type == "Single-key access only"
            is_complex = relationship_type == "Complex relationships or relational schema"
            can_handle_downtime = downtime_tolerance == "Yes"

            # Determine recommendation based on slots
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

            # Calculate estimated cost
            base_costs = {
                "Oracle": 500,
                "MySQL": 200,
                "PostgreSQL": 250,
                "MongoDB": 200,  # Updated to match test expectation
                "Neo4j": 400,
                "SQL Server": 450
            }
            # Extract base database name using regex to get text inside parentheses
            match = re.search(r'\(([^)]+)\)', recommended_db)
            if match:
                base_db = match.group(1).strip()
            else:
                base_db = recommended_db.strip()
            cost = base_costs.get(base_db, 0)
            if not can_handle_downtime:
                cost *= 1.75
            
            estimated_cost = f"${cost:.2f} per month"
            logger.info(f"Recommendation: {recommended_db}, Estimated cost: {estimated_cost}")

            # Return slot updates, use SlotSet for the recommended database as the base name
            return [SlotSet("recommended_database", base_db),
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
        # Retrieve necessary slots
        recommended_database = tracker.get_slot("recommended_database")
        ticket_id = f"DB-{random.randint(1000, 9999)}"
        # Updated message to include the recommended database
        dispatcher.utter_message(
            text=f"Your database request for {recommended_database} has been submitted. Jira ticket {ticket_id} has been created and assigned to the appropriate approver. You will receive notifications about the status of your request."
        )
        return []

class ActionRestart(Action):
    def name(self) -> Text:
        return "action_restart"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message("Let's start over with the database selection process or schema explorer.")
        # Return plain dictionary for restart event
        return [{"event": "restart"}]

class ActionProcessObjectList(Action):
    def name(self) -> Text:
        return "action_process_object_list"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        # Retrieve slots
        host = tracker.get_slot("database_host_endpoint")
        db_type = tracker.get_slot("database_type")
        objects = tracker.get_slot("object_types") or []
        
        # Process request, create JSON output
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

# class ActionExportDefinition(Action):
#     def name(self) -> Text:
#         return "action_export_definition"

#     def run(self, dispatcher: CollectingDispatcher,
#             tracker: Tracker,
#             domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
#         host = tracker.get_slot("database_host_endpoint")
#         # Generate JSON output (if needed) but not used in the final message
#         json_output = {
#             "database_host_endpoint": host,
#             "definitions": {
#                 "tables": [
#                     {
#                         "name": "users",
#                         "columns": [
#                             {"name": "id", "type": "int", "nullable": False},
#                             {"name": "username", "type": "varchar(255)", "nullable": False},
#                             {"name": "email", "type": "varchar(255)", "nullable": False}
#                         ]
#                     }
#                 ],
#                 "views": [
#                     {
#                         "name": "active_users",
#                         "query": "SELECT id, username, email FROM users WHERE active = true"
#                     }
#                 ],
#                 "indexes": [
#                     {
#                         "name": "users_username_idx",
#                         "columns": ["username"],
#                         "type": "unique"
#                     }
#                 ],
#                 "constraints": [
#                     {
#                         "type": "PRIMARY KEY",
#                         "table": "users",
#                         "columns": ["id"]
#                     }
#                 ]
#             }
#         }
        
#         # Updated utterance to match test expectation
#         dispatcher.utter_message(
#             text="Your database definition has been exported in JSON format. You can download it from your notification center."
#         )
#         return []
    
# class ActionValidateTemplate(Action):
#     def name(self) -> Text:
#         return "action_validate_template"

#     def run(self, dispatcher: CollectingDispatcher,
#             tracker: Tracker,
#             domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
#         # Retrieve user's message safely (avoid errors if latest_message is missing)
#         latest_message = getattr(tracker, "latest_message", {}) or {}
#         user_input = latest_message.get("text", "")
#         if "template" in user_input.lower():
#             return [SlotSet("template_valid", True)]
#         else:
#             return [SlotSet("template_valid", False)]



# Keep the existing ActionValidateTemplate class and add JSON parsing capability
class ActionValidateTemplate(Action):
    def name(self) -> Text:
        return "action_validate_template"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        # Retrieve user's message safely
        latest_message = getattr(tracker, "latest_message", {}) or {}
        user_input = latest_message.get("text", "")
        
        # Check if the message contains a JSON template
        try:
            # Find JSON content in the message
            json_match = re.search(r'(\{.*\})', user_input, re.DOTALL)
            if json_match:
                json_content = json_match.group(1)
                # Parse the JSON content
                template_data = json.loads(json_content)
                
                # Store the template data in a slot
                return [
                    SlotSet("template_valid", True),
                    SlotSet("template_data", template_data)
                ]
            else:
                # If no JSON found but contains the word template
                if "template" in user_input.lower():
                    return [SlotSet("template_valid", True)]
                else:
                    return [SlotSet("template_valid", False)]
        except json.JSONDecodeError:
            # Invalid JSON format
            dispatcher.utter_message("Invalid JSON format in template. Please check and try again.")
            return [SlotSet("template_valid", False)]
        except Exception as e:
            logger.error(f"Error validating template: {e}", exc_info=True)
            return [SlotSet("template_valid", False)]

# Modify the ActionExportDefinition class to use the template data
class ActionExportDefinition(Action):
    def name(self) -> Text:
        return "action_export_definition"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        # Get the template data if it exists
        template_data = tracker.get_slot("template_data")
        host = tracker.get_slot("database_host_endpoint")
        
        if template_data:
            # Use the provided template data to generate a customized definition
            json_output = {
                "database_host_endpoint": template_data.get("database_host_endpoint", host or "dbname.rds.amazonaws.com:5432"),
                "definitions": {}
            }
            
            # Process each object type from the template
            objects = template_data.get("objects", {})
            
            # Process tables
            if "tables" in objects:
                json_output["definitions"]["tables"] = []
                for table in objects.get("tables", []):
                    table_def = {
                        "name": table,
                        "columns": [
                            {"name": "id", "type": "int", "nullable": False},
                            {"name": "name", "type": "varchar(255)", "nullable": False},
                            {"name": "description", "type": "text", "nullable": True}
                        ]
                    }
                    json_output["definitions"]["tables"].append(table_def)
            
            # Process views
            if "views" in objects:
                json_output["definitions"]["views"] = []
                for view in objects.get("views", []):
                    view_def = {
                        "name": view,
                        "query": f"SELECT * FROM {view.replace('_view', '')}"
                    }
                    json_output["definitions"]["views"].append(view_def)
            
            # Process indexes
            if "indexes" in objects:
                json_output["definitions"]["indexes"] = []
                for index in objects.get("indexes", []):
                    index_def = {
                        "name": index,
                        "columns": [index.split("_")[0]],
                        "type": "btree"
                    }
                    json_output["definitions"]["indexes"].append(index_def)
            
            # Process constraints
            if "constraints" in objects:
                json_output["definitions"]["constraints"] = []
                for constraint in objects.get("constraints", []):
                    constraint_def = {
                        "type": "FOREIGN KEY" if "_fk" in constraint else "PRIMARY KEY",
                        "table": constraint.split("_")[0],
                        "columns": [constraint.split("_")[0] + "_id"]
                    }
                    json_output["definitions"]["constraints"].append(constraint_def)
            
            # Display the generated definitions
            dispatcher.utter_message(f"Your database definition has been exported in JSON format:")
            dispatcher.utter_message(f"```json\n{json.dumps(json_output, indent=2)}\n```")
            dispatcher.utter_message("You can download it from your notification center.")
        else:
            # Use the default response if no template data is provided
            dispatcher.utter_message(
                text="Your database definition has been exported in JSON format."
            )
        
        return []