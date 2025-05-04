from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
import logging
import re
import random

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
                "MongoDB": 200,
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
        
        

class ActionRecommendDatabaseCreateTicket(Action):
    def name(self) -> Text:
        return "action_recommend_database_create_ticket"

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