from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker, FormValidationAction
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
import logging
import re
import random
import os
import json
import requests
from typing import Any, Text, Dict, List
from rasa_sdk.types import DomainDict

logger = logging.getLogger(__name__)

class ValidateRecommendDatabaseForm(FormValidationAction):
    def name(self) -> Text:
        return "validate_recommend_database_form"

    async def required_slots(
        self,
        domain_slots: List[Text],
        dispatcher: "CollectingDispatcher",
        tracker: "Tracker",
        domain: "DomainDict",
    ) -> List[Text]:
        """Define conditional required slots based on user answers."""
        
        required_slots = ["app_architect", "is_reviewed"]
        
        # If reviewed = Yes, need epic link
        is_reviewed = tracker.get_slot("is_reviewed")
        if is_reviewed == "Yes":
            required_slots.append("epic_link")
        
        # Always need has_sysid and data_nature after the review question
        required_slots.extend(["has_sysid", "data_nature"])
        
        data_nature = tracker.get_slot("data_nature")
        
        # If Analytics, stop here - no more slots needed
        if data_nature == "Analytics":
            return required_slots
            
        # If Transactional, need data_structure
        if data_nature == "Transactional":
            required_slots.append("data_structure")
            
            data_structure = tracker.get_slot("data_structure")
            
            # If Unstructured, stop here
            if data_structure == "Unstructured":
                return required_slots
                
            # If Structured, need app_type
            if data_structure == "Structured":
                required_slots.append("app_type")
                
                app_type = tracker.get_slot("app_type")
                
                # If Vendor Application, need vendor_recommended_db
                if app_type == "Vendor Application":
                    required_slots.append("vendor_recommended_db")
                    
                # If CFG Developed, need acid_compliance
                elif app_type == "CFG Developed":
                    required_slots.append("acid_compliance")
                    
                    acid_compliance = tracker.get_slot("acid_compliance")
                    
                    # If Yes to ACID, need open source and MS licensing questions
                    if acid_compliance == "Yes":
                        required_slots.extend(["is_open_source", "ms_licensing"])
                    elif acid_compliance == "No":
                        # If No to ACID, need database size question
                        required_slots.append("database_size_large")
        
        return required_slots

class ActionRecommendDatabase(Action):
    def name(self) -> Text:
        return "action_recommend_database"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        try:
            # Retrieve slot values
            app_architect = tracker.get_slot("app_architect") or "Not provided"
            is_reviewed = tracker.get_slot("is_reviewed") or "No"
            epic_link = tracker.get_slot("epic_link") or "Not provided"
            has_sysid = tracker.get_slot("has_sysid") or "Not provided"
            
            data_nature = tracker.get_slot("data_nature")
            data_structure = tracker.get_slot("data_structure")
            app_type = tracker.get_slot("app_type")
            vendor_recommended_db = tracker.get_slot("vendor_recommended_db")
            acid_compliance = tracker.get_slot("acid_compliance")
            is_open_source = tracker.get_slot("is_open_source")
            ms_licensing = tracker.get_slot("ms_licensing")
            
            logger.info(f"DEBUG - All slots: data_nature={data_nature}, data_structure={data_structure}, "
                       f"app_type={app_type}, vendor_recommended_db={vendor_recommended_db}, "
                       f"acid_compliance={acid_compliance}, is_open_source={is_open_source}, "
                       f"ms_licensing={ms_licensing}")

            # NEW LOGIC IMPLEMENTATION
            recommended_db = "No recommendation"
            recommendation_reason = ""
            
            if data_nature == "Analytics":
                # Analytics (OLAP) → Available soon
                dispatcher.utter_message(text="Feature under development, will be available soon.")
                return []
                
            elif data_nature == "Transactional":
                if data_structure == "Unstructured":
                    # Unstructured → Available soon
                    dispatcher.utter_message(text="Feature under development, will be available soon.")
                    return []
                    
                elif data_structure == "Structured":
                    if app_type == "Vendor Application":
                        if vendor_recommended_db == "Yes":
                            # Vendor recommends Oracle/Postgres → Contact DBA Team
                            dispatcher.utter_message(text="Require additional review; please contact DBA Team – dl-edsdelivery@citizensbank.com.")
                            return []
                        elif vendor_recommended_db == "No":
                            # Vendor doesn't recommend → Available soon
                            dispatcher.utter_message(text="Feature under development, will be available soon.")
                            return []
                            
                    elif app_type == "CFG Developed":
                        if acid_compliance == "Yes":
                            # Need ACID compliance - ask about open source
                            if is_open_source == "Yes":
                                # Open source application
                                if ms_licensing == "Yes":
                                    recommended_db = "MS SQL Server"
                                    recommendation_reason = "Selected for open-source application with Microsoft dependencies requiring ACID compliance."
                                elif ms_licensing == "No":
                                    recommended_db = "PostgreSQL"
                                    recommendation_reason = "Selected for open-source application without Microsoft dependencies requiring ACID compliance."
                            elif is_open_source == "No":
                                # Proprietary application
                                if ms_licensing == "Yes":
                                    recommended_db = "MS SQL Server"
                                    recommendation_reason = "Selected for proprietary application with Microsoft dependencies requiring ACID compliance."
                                elif ms_licensing == "No":
                                    recommended_db = "PostgreSQL"
                                    recommendation_reason = "Selected for proprietary application without Microsoft dependencies requiring ACID compliance."
                        elif acid_compliance == "No":
                            # No ACID compliance needed - ask about database size
                            database_size_large = tracker.get_slot("database_size_large")
                            if database_size_large == "Yes":
                                recommended_db = "PostgreSQL"
                                recommendation_reason = "Selected for large database (>300GB) without strict ACID compliance requirements."
                            elif database_size_large == "No":
                                recommended_db = "MySQL"
                                recommendation_reason = "Selected for smaller database (<300GB) without strict ACID compliance requirements."
            
            # If we got a recommendation, show it
            if recommended_db != "No recommendation":
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

                return [SlotSet("recommended_database", recommended_db),
                        SlotSet("ticket_id", ticket_id)]
            
            # Fallback if no path matched
            dispatcher.utter_message(text="I couldn't determine a recommendation based on your inputs. Please try again.")
            return []
            
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
        ticket_id = tracker.get_slot("ticket_id")
        
        #Retrieve all form information
        app_architect = tracker.get_slot("app_architect") or "Not provided"
        is_reviewed = tracker.get_slot("is_reviewed") or "Not specified"
        epic_link = tracker.get_slot("epic_link") or "Not provided"
        has_sysid = tracker.get_slot("has_sysid") or "Not specified"
        data_nature = tracker.get_slot("data_nature") or "Not specified"
        data_structure = tracker.get_slot("data_structure") or "Not specified"
        app_type = tracker.get_slot("app_type") or "Not specified"
        acid_compliance = tracker.get_slot("acid_compliance") or "Not specified"
        is_open_source = tracker.get_slot("is_open_source") or "Not specified"
        ms_licensing = tracker.get_slot("ms_licensing") or "Not specified"
        vendor_recommended_db = tracker.get_slot("vendor_recommended_db") or "Not specified"
                
        logger.info("Creating a jira ticket for user request")
        # logger.info(f"Slots received: recommended_database={recommended_database}, estimated_cost={estimated_cost}, app_type={app_type}, feature_type={feature_type}, relationship_type={relationship_type}, downtime_tolerance={downtime_tolerance}")
        jira_link = "https://citizensbank-sandbox.atlassian.net/browse/EDE-155854"

        try:
            payload = json.dumps({
                    "fields": {
                    "project":
                    {
                        "key": "EDE"
                    },
                    "summary": "Database choice analysis",
                    "description": f"""Database choice analysis for the application
                        
                        Application Information:
                        1. Application Architect/Owner: {app_architect}
                        2. Architecture Review Status: {is_reviewed}
                        3. Epic/Initiative Link: {epic_link}
                        4. SYSD/Business Mapping Available: {has_sysid}   
                    
                        Technical Requirements:
                        1. What is the nature of data you intend to store? {data_nature}
                        2. How do you define your data? {data_structure}
                        3. Is it a Vendor Application (COTS) or CFG developed? {app_type}
                        4. Does your application need strict ACID SQL Compliance? {acid_compliance}
                        5. Is your Application Open source? {is_open_source}
                        6. Does your Application have Microsoft licensing dependency? {ms_licensing}
                        7. Does Vendor recommend any Database types? {vendor_recommended_db}
                        
                        Recommendation:
                        {recommended_database}
                        
                    """,
                    "issuetype": {
                        "name": "Story"
                    }
                }
            })
            auth = (os.environ["EDDI_JIRA_USER"], os.environ["EDDI_JIRA_API_TOKEN"])
            

            response = requests.post("http://citizensbank-sandbox.atlassian.net/rest/api/2/issue",
                                    headers={
                                        "content-type":"application/json"
                                    },
                                    auth=auth,
                                    data=payload)
            
            if response.status_code != 201:
                error_message = response.json().get("errors", response.text)
                logger.error(f"Failed to create Jira ticket. Status code: {response.status_code}, Error: {error_message}")
                dispatcher.utter_message(
                    text="Sorry, there was an issue creating the Jira ticket. Please try again later or contact support."
                )
                return []
            
            data = response.json()
            ticket_id = data["key"]
            jira_link = f"https://citizensbank-sandbox.atlassian.net/browse/{ticket_id}"
            logger.info(f"Jira ticket created: {ticket_id}")
            
        except Exception as e:
            logger.error(f"Error creating Jira ticket: {e}", exc_info=True)

        dispatcher.utter_message(
            text=f"Your database request for {recommended_database} has been submitted. [Jira ticket]({jira_link}) has been created and assigned to the appropriate approver. You will receive notifications about the status of your request."
        )

        return []

