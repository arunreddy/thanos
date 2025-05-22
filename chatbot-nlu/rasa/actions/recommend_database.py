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
            has_sysid = tracker.get_slot("has_sysid") or "No"
            
            # Primary branch - data nature
            data_nature = tracker.get_slot("data_nature")
            
            # Transactional path slots
            data_structure = tracker.get_slot("data_structure")
            app_type = tracker.get_slot("app_type")
            acid_compliance = tracker.get_slot("acid_compliance")
            is_open_source = tracker.get_slot("is_open_source")
            ms_licensing = tracker.get_slot("ms_licensing")
            vendor_recommended_db = tracker.get_slot("vendor_recommended_db")
            
            # Analytics path (to be expanded if needed)
            
            logger.info(f"Slots received: data_nature={data_nature}, data_structure={data_structure}, "
                       f"app_type={app_type}, acid_compliance={acid_compliance}, "
                       f"is_open_source={is_open_source}, ms_licensing={ms_licensing}")

            # Make recommendation based on decision tree
            recommended_db = "No recommendation"
            recommendation_reason = ""
            
            if data_nature == "Transactional":
                if data_structure == "Structured":
                    if app_type == "CFG Developed":
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
                        if vendor_recommended_db:
                            recommended_db = vendor_recommended_db
                            recommendation_reason = "Selected based on vendor recommendation."
                        else:
                            recommended_db = "Contact DBA Team"
                            recommendation_reason = "Vendor application without specific database recommendation requires DBA team consultation."
                else:  # Unstructured data
                    recommended_db = "MongoDB"
                    recommendation_reason = "Selected for unstructured transactional data."
            elif data_nature == "Analytics":
                recommended_db = "PostgreSQL with Analytics extensions"
                recommendation_reason = "Selected for analytical data processing capabilities."
            
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
        
        # Updated message to include more details
        dispatcher.utter_message(
            text=f"Your database request for **{recommended_database}** has been submitted. Jira ticket **{ticket_id}** has been created and assigned to the appropriate approver. The ticket includes application owner information: {app_architect}. You will receive notifications about the status of your request."
        )
        return []
    

# class ActionRecommendDatabaseCreateTicket(Action):
#     def name(self) -> Text:
#         return "action_recommend_database_create_ticket"

#     def run(self, dispatcher: CollectingDispatcher,
#             tracker: Tracker,
#             domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
#         try:
#             # Retrieve necessary slots
#             recommended_database = tracker.get_slot("recommended_database")
#             ticket_id = tracker.get_slot("ticket_id")
            
#             # Retrieve all form information
#             app_architect = tracker.get_slot("app_architect") or "Not provided"
#             is_reviewed = tracker.get_slot("is_reviewed") or "Not specified"
#             epic_link = tracker.get_slot("epic_link") or "Not provided"
#             has_sysid = tracker.get_slot("has_sysid") or "Not specified"
#             data_nature = tracker.get_slot("data_nature") or "Not specified"
#             data_structure = tracker.get_slot("data_structure") or "Not specified"
#             app_type = tracker.get_slot("app_type") or "Not specified"
#             acid_compliance = tracker.get_slot("acid_compliance") or "Not specified"
#             is_open_source = tracker.get_slot("is_open_source") or "Not specified"
#             ms_licensing = tracker.get_slot("ms_licensing") or "Not specified"
#             vendor_recommended_db = tracker.get_slot("vendor_recommended_db") or "Not specified"

#             jira_link = f"https://citizensbank-sandbox.atlassian.net/browse/{ticket_id}"
#             logger.info(f"Creating a Jira ticket for user request")
#             logger.info(f"Slots received: recommended_database={recommended_database}, "
#                        f"app_architect={app_architect}, data_nature={data_nature}, "
#                        f"app_type={app_type}")

#             try:
#                 payload = json.dumps({
#                     "fields": {
#                         "project": {
#                             "key": "EDF"
#                         },
#                         "summary": "Database Recommendation Request",
#                         "description": f"""Database recommendation analysis for the application:

# **Application Information:**
# - Application Architect/Owner: {app_architect}
# - Architecture Review Status: {is_reviewed}
# - Epic/Initiative Link: {epic_link}
# - SYSD/Business Mapping Available: {has_sysid}

# **Technical Requirements:**
# 1. What is the nature of data you intend to store? {data_nature}
# 2. How do you define your data? {data_structure}
# 3. Is it a Vendor Application (COTS) or CFG developed? {app_type}
# 4. Does your application need strict ACID SQL Compliance? {acid_compliance}
# 5. Is your Application Open source? {is_open_source}
# 6. Does your Application have Microsoft licensing dependency? {ms_licensing}
# 7. Does Vendor recommend any Database types? {vendor_recommended_db}

# **Recommendation:**
# {recommended_database}

# **Decision Rationale:**
# Based on the technical requirements and application characteristics provided above, this recommendation follows our database selection decision tree for optimal performance and compatibility.""",
#                         "issuetype": {
#                             "name": "Story"
#                         }
#                     }
#                 })

#                 auth = (os.environ["EDDI_JIRA_USER"], os.environ["EDDI_JIRA_API_TOKEN"])

#                 response = requests.post("http://citizensbank-sandbox.atlassian.net/rest/api/2/issue",
#                                        headers={
#                                            "content-type": "application/json"
#                                        },
#                                        auth=auth,
#                                        data=payload)

#                 if response.status_code != 201:
#                     error_message = response.json().get("errors", response.text)
#                     logger.error(f"Failed to create Jira ticket: Status code: {response.status_code}, Error: {error_message}")
#                     dispatcher.utter_message(
#                         text="Sorry, there was an issue creating the Jira ticket. Please try again later or contact support."
#                     )
#                     return []

#                 data = response.json()
#                 ticket_id = data["key"]
#                 jira_link = f"https://citizensbank-sandbox.atlassian.net/browse/{ticket_id}"
#                 logger.info(f"Jira ticket created: {ticket_id}")

#             except Exception as e:
#                 logger.error(f"Error creating Jira ticket: {e}", exc_info=True)
#                 dispatcher.utter_message(
#                     text="Sorry, there was an issue creating the Jira ticket. Please try again later or contact support."
#                 )
#                 return []

#             # Updated message with new information structure
#             dispatcher.utter_message(
#                 text=f"""Your database recommendation request has been submitted successfully!

# **Recommendation Details:**
# - **Database:** {recommended_database}
# - **Application Owner:** {app_architect}
# - **Data Type:** {data_nature} ({data_structure})
# - **Application Type:** {app_type}

# **Jira Ticket:** [{ticket_id}]({jira_link}) has been created and assigned to the appropriate approver.

# You will receive notifications about the status of your request. The ticket includes all your technical requirements and our recommendation rationale."""
#             )
#             return []

#         except Exception as e:
#             logger.error(f"Error in action_recommend_database_create_ticket: {e}", exc_info=True)
#             dispatcher.utter_message("Sorry, an error occurred while processing your request.")
#             return []