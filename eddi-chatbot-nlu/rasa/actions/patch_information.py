# rasa/actions/patch_information.py

from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, FollowupAction
import logging

logger = logging.getLogger(__name__)

class ActionAskHostname(Action):
    """Action to ask user for hostname."""
    
    def name(self) -> Text:
        return "action_ask_hostname"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        dispatcher.utter_message(text="Please provide the hostname for which you want patch information.")
        return []

class ActionConfirmHostname(Action):
    """Action to confirm the hostname with the user."""
    
    def name(self) -> Text:
        return "action_confirm_hostname"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        hostname = tracker.get_slot("hostname")
        
        if not hostname:
            dispatcher.utter_message(text="I didn't catch the hostname. Could you please provide it again?")
            return []
        
        # Check if the hostname is actually a button payload (like /affirm, /deny, etc.)
        if hostname.startswith('/'):
            dispatcher.utter_message(text="I didn't catch the hostname. Could you please provide it again?")
            return [SlotSet("hostname", None)]
        
        dispatcher.utter_message(
            text=f"I'll look up patch information for hostname: **{hostname}**. Is this correct?",
            buttons=[
                {"title": "Yes, proceed", "payload": "/affirm"},
                {"title": "No, change hostname", "payload": "/deny"},
                {"title": "Back to main menu", "payload": "/help"}
            ]
        )
        return []

class ActionGetPatchInformation(Action):
    """Action to return mock patch information."""
    
    def name(self) -> Text:
        return "action_get_patch_information"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        hostname = tracker.get_slot("hostname")
        
        if not hostname:
            dispatcher.utter_message(text="I don't have a hostname to query. Please provide one.")
            return []
        
        try:
            # Get mock patch information
            patch_info = self._get_mock_patch_data(hostname)
            
            if patch_info:
                dispatcher.utter_message(text=self._format_patch_information(patch_info, hostname))
                # Add navigation options after showing patch info
                dispatcher.utter_message(
                    text="What would you like to do next?",
                    buttons=[
                        {"title": "Check another hostname", "payload": "/get_patch_information"},
                        {"title": "Back to main menu", "payload": "/help"},
                        {"title": "Goodbye", "payload": "/goodbye"}
                    ]
                )
            else:
                dispatcher.utter_message(
                    text=f"No patch information found for hostname: **{hostname}**. This could mean:\n"
                         f"• The hostname doesn't exist in our system\n"
                         f"• No patches have been installed on this host\n"
                         f"• The hostname format is incorrect",
                    buttons=[
                        {"title": "Try another hostname", "payload": "/get_patch_information"},
                        {"title": "Back to main menu", "payload": "/help"},
                        {"title": "Goodbye", "payload": "/goodbye"}
                    ]
                )
                
        except Exception as e:
            logger.error(f"Error getting patch information: {e}")
            dispatcher.utter_message(
                text="Sorry, I encountered an error while retrieving patch information. Please try again later.",
                buttons=[
                    {"title": "Try again", "payload": "/get_patch_information"},
                    {"title": "Back to main menu", "payload": "/help"}
                ]
            )
        
        return []
    
    def _get_mock_patch_data(self, hostname: str) -> List[Dict]:
        """Return mock patch information for testing."""
        
        # Mock data for different hostnames
        mock_data = {
            "server-001": [
                {
                    "patch_name": "Security Patch 2024-001",
                    "patch_version": "1.0.0",
                    "installation_date": "2024-01-15 10:30:00",
                    "status": "installed",
                    "description": "Critical security update for OpenSSL vulnerability CVE-2024-1234"
                },
                {
                    "patch_name": "Performance Patch 2024-002",
                    "patch_version": "2.1.0",
                    "installation_date": "2024-02-20 14:15:00",
                    "status": "installed",
                    "description": "Performance improvements for database queries and memory management"
                },
                {
                    "patch_name": "Bug Fix Patch 2024-003",
                    "patch_version": "1.2.1",
                    "installation_date": "2024-03-10 09:45:00",
                    "status": "installed",
                    "description": "Fixed memory leak in logging system and improved error handling"
                }
            ],
            "server-002": [
                {
                    "patch_name": "Security Patch 2024-001",
                    "patch_version": "1.0.0",
                    "installation_date": "2024-01-16 11:20:00",
                    "status": "installed",
                    "description": "Critical security update for OpenSSL vulnerability CVE-2024-1234"
                },
                {
                    "patch_name": "Feature Patch 2024-004",
                    "patch_version": "3.0.0",
                    "installation_date": "2024-03-05 16:30:00",
                    "status": "installed",
                    "description": "Added new monitoring capabilities and enhanced reporting features"
                }
            ],
            "server-003": [
                {
                    "patch_name": "Security Patch 2024-001",
                    "patch_version": "1.0.0",
                    "installation_date": "2024-01-17 13:45:00",
                    "status": "pending",
                    "description": "Critical security update for OpenSSL vulnerability CVE-2024-1234"
                },
                {
                    "patch_name": "Maintenance Patch 2024-005",
                    "patch_version": "1.1.0",
                    "installation_date": "2024-03-12 08:15:00",
                    "status": "installed",
                    "description": "Routine maintenance updates and system optimizations"
                }
            ]
        }
        
        # Return data for the specific hostname, or empty list if not found
        return mock_data.get(hostname.lower(), [])
    
    def _format_patch_information(self, patch_info: List[Dict], hostname: str) -> str:
        """Format patch information for display."""
        
        if not patch_info:
            return f"No patch information found for hostname: **{hostname}**"
        
        response = f"## Patch Information for **{hostname}**\n\n"
        
        for i, patch in enumerate(patch_info, 1):
            response += f"### Patch {i}\n"
            response += f"- **Name**: {patch['patch_name']}\n"
            response += f"- **Version**: {patch['patch_version']}\n"
            response += f"- **Installation Date**: {patch['installation_date']}\n"
            response += f"- **Status**: {patch['status']}\n"
            response += f"- **Description**: {patch['description']}\n\n"
        
        return response

class ActionResetPatchForm(Action):
    """Action to reset the patch form when user denies hostname."""
    
    def name(self) -> Text:
        return "action_reset_patch_form"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Reset the hostname slot
        dispatcher.utter_message(text="No problem! Let's try a different hostname.")
        return [SlotSet("hostname", None)]

class ActionBackToMainMenu(Action):
    """Action to take user back to main menu from patch flow."""
    
    def name(self) -> Text:
        return "action_back_to_main_menu"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Reset the hostname slot
        dispatcher.utter_message(text="Taking you back to the main menu...")
        return [SlotSet("hostname", None)] 