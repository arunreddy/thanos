# This files contains your custom actions which can be used to run
# custom Python code.
#
# See this guide on how to implement these action:
# https://rasa.com/docs/rasa/custom-actions


import logging
import random
from typing import Any, Dict, List, Text

from rasa_sdk import Action, Tracker
from rasa_sdk.events import Restarted, SlotSet
from rasa_sdk.executor import CollectingDispatcher

logger = logging.getLogger(__name__)


class ActionRecommendDatabase(Action):
    def name(self) -> Text:
        return "action_recommend_database"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        try:
            # Retrieve slot values
            app_type = tracker.get_slot("app_type")
            feature_type = tracker.get_slot("feature_type")
            relationship_type = tracker.get_slot("relationship_type")
            downtime_tolerance = tracker.get_slot("downtime_tolerance")

            logger.info(f"Slots received: app_type={app_type}, feature_type={feature_type}, " f"relationship_type={relationship_type}, downtime_tolerance={downtime_tolerance}")

            print(f"Slots received: app_type={app_type}, feature_type={feature_type}, " f"relationship_type={relationship_type}, downtime_tolerance={downtime_tolerance}")

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
            base_costs = {"Oracle": 500, "MySQL": 200, "PostgreSQL": 250, "MongoDB": 300, "Neo4j": 400, "SQL Server": 450}

            # Extract the base database name (text before any parenthesis)
            base_db = recommended_db.split("(")[0].strip()
            cost = base_costs.get(base_db, 0)
            if "Multi-AZ" in recommended_db:
                cost *= 1.75

            estimated_cost = f"${cost:.2f} per month"
            logger.info(f"Recommendation: {recommended_db}, Estimated cost: {estimated_cost}")
            print(f"Recommendation: {recommended_db}, Estimated cost: {estimated_cost}")

            return [SlotSet("recommended_database", recommended_db), SlotSet("estimated_cost", estimated_cost)]
        except Exception as e:
            logger.error(f"Error in action_recommend_database: {e}", exc_info=True)
            dispatcher.utter_message("Sorry, an error occurred while processing your request.")
            return []


class ActionSubmitRequest(Action):
    def name(self) -> Text:
        return "action_submit_request"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
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

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message("Let's start over with the database selection process.")
        return [Restarted()]
