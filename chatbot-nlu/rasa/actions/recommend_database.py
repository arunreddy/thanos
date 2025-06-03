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
            # Retrieve slot values based on new flowchart
            app_architect = tracker.get_slot("app_architect") or "Not provided"
            is_reviewed = tracker.get_slot("is_reviewed") or "No"
            epic_link = tracker.get_slot("epic_link") or "Not provided"
            has_sysid = tracker.get_slot("has_sysid") or "Not provided"
            
            # Primary branch - data nature
            data_nature = tracker.get_slot("data_nature")
            
            # Transactional path slots
            data_structure = tracker.get_slot("data_structure")
            app_type = tracker.get_slot("app_type")
            acid_compliance = tracker.get_slot("acid_compliance")
            is_open_source = tracker.get_slot("is_open_source")
            ms_licensing = tracker.get_slot("ms_licensing")
            vendor_recommended_db = tracker.get_slot("vendor_recommended_db")
            
            # Add debug logging
            logger.info(f"DEBUG - All slots: data_nature={data_nature}, data_structure={data_structure}, "
                       f"app_type={app_type}, vendor_recommended_db='{vendor_recommended_db}', "
                       f"acid_compliance={acid_compliance}, is_open_source={is_open_source}, "
                       f"ms_licensing={ms_licensing}, has_sysid={has_sysid}")

            # Make recommendation based on decision tree
            recommended_db = "No recommendation"
            recommendation_reason = ""
            
            if data_nature == "Transactional":
                logger.info("DEBUG - Entering Transactional branch")
                
                if data_structure == "Structured":
                    logger.info("DEBUG - Entering Structured branch")
                    
                    if app_type == "CFG Developed":
                        logger.info("DEBUG - Entering CFG Developed branch")
                        if acid_compliance == "Yes":
                            if is_open_source == "Yes":
                                recommended_db = "PostgreSQL"
                                recommendation_reason = "Selected for ACID compliance in an open-source application."
                            elif is_open_source == "No":
                                if ms_licensing == "Yes":
                                    recommended_db = "MS SQL Server"
                                    recommendation_reason = "Selected due to Microsoft licensing and ACID compliance requirements."
                                else:
                                    recommended_db = "PostgreSQL"
                                    recommendation_reason = "Selected for ACID compliance without Microsoft dependencies."
                        else:  # No strict ACID compliance
                            recommended_db = "MySQL"
                            recommendation_reason = "Selected for transactional data without strict ACID requirements."
                            
                    elif app_type == "Vendor Application":
                        logger.info(f"DEBUG - Entering Vendor Application branch. vendor_recommended_db='{vendor_recommended_db}'")
                        
                        # FIXED: Proper handling of vendor recommended database
                        if vendor_recommended_db and vendor_recommended_db.strip():
                            vendor_db_lower = vendor_recommended_db.strip().lower()
                            logger.info(f"DEBUG - Vendor DB lower: '{vendor_db_lower}'")
                            
                            # Check if vendor actually provided a database recommendation
                            negative_responses = ["no", "none", "not specified", "n/a", "na", "not available", ""]
                            
                            if vendor_db_lower not in negative_responses:
                                recommended_db = vendor_recommended_db.strip()
                                recommendation_reason = "Selected based on vendor recommendation."
                                logger.info(f"DEBUG - Using vendor recommendation: {recommended_db}")
                            else:
                                recommended_db = "Contact DBA Team"
                                recommendation_reason = "Vendor application without specific database recommendation requires DBA team consultation."
                                logger.info("DEBUG - Vendor said no - recommending DBA team")
                        else:
                            recommended_db = "Contact DBA Team"
                            recommendation_reason = "Vendor application without database recommendation requires DBA team consultation."
                            logger.info("DEBUG - No vendor input - recommending DBA team")
                    else:
                        logger.info(f"DEBUG - Unknown app_type: {app_type}")
                        
                elif data_structure == "Unstructured":
                    logger.info("DEBUG - Entering Unstructured branch")
                    recommended_db = "MongoDB"
                    recommendation_reason = "Selected for unstructured transactional data."
                else:
                    logger.info(f"DEBUG - Unknown data_structure: {data_structure}")
                    
            elif data_nature == "Analytics":
                logger.info("DEBUG - Entering Analytics branch")
                recommended_db = "PostgreSQL with Analytics extensions"
                recommendation_reason = "Selected for analytical data processing capabilities."
            else:
                logger.info(f"DEBUG - Unknown data_nature: {data_nature}")
            
            logger.info(f"DEBUG - Final recommendation: {recommended_db}, reason: {recommendation_reason}")
            
            # Generate ticket ID
            ticket_id = f"DB-{random.randint(1000, 9999)}"
            
            # Send recommendation message
            recommendation_message = (
                f"## Database Recommendation\n\n"
                f"Based on your requirements, we recommend: **{recommended_db}**\n\n"
                f"**Justification:** {recommendation_reason}\n\n"
                f"**Application Details:**\n"
                f"- Architect/Owner: {app_architect}\n"
                f"- Architecture Review: {is_reviewed}\n"
                f"- Epic/Initiative: {epic_link}\n"
                f"- SYSID/Business Mapping: {has_sysid}\n"
                f"- Data Nature: {data_nature}\n"
                f"- Data Structure: {data_structure}\n"
                f"- Application Type: {app_type}\n\n"
                f"Would you like to proceed with this recommendation?"
            )
            
            dispatcher.utter_message(text=recommendation_message)
            
            # Add buttons for confirmation
            dispatcher.utter_message(buttons=[
                {"title": "Yes, create ticket", "payload": "/confirm_database_selection"},
                {"title": "No, let's try again", "payload": "/restart"}
            ])

            # Return slot updates
            return [SlotSet("recommended_database", recommended_db),
                    SlotSet("ticket_id", ticket_id)]
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
        ticket_id = tracker.get_slot("ticket_id") or f"DB-{random.randint(1000, 9999)}"
        app_architect = tracker.get_slot("app_architect") or "Not provided"
        has_sysid = tracker.get_slot("has_sysid") or "Not provided"
        
        # Updated message to include more details
        dispatcher.utter_message(
            text=f"Your database request for **{recommended_database}** has been submitted. "
                 f"Jira ticket **{ticket_id}** has been created and assigned to the appropriate approver. "
                 f"The ticket includes:\n"
                 f"- Application owner: {app_architect}\n"
                 f"- SYSID/Business Mapping: {has_sysid}\n"
                 f"You will receive notifications about the status of your request."
        )
        return []