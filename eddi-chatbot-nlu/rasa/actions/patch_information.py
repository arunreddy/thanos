# rasa/actions/patch_information.py

from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, FollowupAction
import logging
from .db_utils import db_connection

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
    """Action to return patch information from PostgreSQL database."""
    
    def name(self) -> Text:
        return "action_get_patch_information"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        hostname = tracker.get_slot("hostname")
        logger.info(f"ActionGetPatchInformation called with hostname: '{hostname}'")
        
        if not hostname:
            logger.warning("No hostname found in slot")
            dispatcher.utter_message(text="I don't have a hostname to query. Please provide one.")
            return []
        
        logger.info(f"Processing patch information request for hostname: '{hostname}'")
        
        try:
            # First check if the hostname exists in the inventory
            logger.info(f"Checking if hostname '{hostname}' exists in inventory")
            if not db_connection.check_hostname_exists(hostname):
                logger.warning(f"Hostname '{hostname}' not found in inventory")
                dispatcher.utter_message(
                    text=f"❌ **Hostname not found**: `{hostname}` is not in our inventory.\n\n"
                         f"Please check the hostname and try again. You can:\n"
                         f"• Verify the spelling\n"
                         f"• Use a different hostname\n"
                         f"• Contact the database team for assistance",
                    buttons=[
                        {"title": "Try another hostname", "payload": "/get_patch_information"},
                        {"title": "Back to main menu", "payload": "/help"},
                        {"title": "Goodbye", "payload": "/goodbye"}
                    ]
                )
                return []
            
            logger.info(f"Hostname '{hostname}' found in inventory, retrieving details")
            
            # Get host information
            host_info = db_connection.get_host_info(hostname)
            logger.info(f"Retrieved host info: {host_info}")
            
            # Get patch information
            patches = db_connection.get_patch_information(hostname)
            logger.info(f"Retrieved {len(patches)} patches for hostname '{hostname}'")
            
            if patches:
                logger.info(f"Formatting patch information for {len(patches)} patches")
                response = self._format_patch_information(patches, hostname, host_info)
                dispatcher.utter_message(text=response)
                
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
                # Host exists but no patches found
                logger.info(f"Host '{hostname}' found but no patches available")
                response = self._format_no_patches_message(hostname, host_info)
                dispatcher.utter_message(text=response)
                
                dispatcher.utter_message(
                    text="What would you like to do next?",
                    buttons=[
                        {"title": "Check another hostname", "payload": "/get_patch_information"},
                        {"title": "Back to main menu", "payload": "/help"},
                        {"title": "Goodbye", "payload": "/goodbye"}
                    ]
                )
                
        except Exception as e:
            logger.error(f"Error getting patch information: {e}")
            dispatcher.utter_message(
                text="❌ **Database Error**: I encountered an error while retrieving patch information.\n\n"
                     f"Error details: {str(e)}\n\n"
                     f"Please try again later or contact the database team for assistance.",
                buttons=[
                    {"title": "Try again", "payload": "/get_patch_information"},
                    {"title": "Back to main menu", "payload": "/help"}
                ]
            )
        
        return []
    
    def _format_patch_information(self, patches: List[Dict], hostname: str, host_info: Dict = None) -> str:
        """Format patch information for display."""
        
        response = f"## 📋 Patch Information for **{hostname}**\n\n"
        
        # Add host information if available
        if host_info:
            response += f"**Host Details:**\n"
            response += f"- **Resource Name**: {host_info.get('resource_nm', 'N/A')}\n"
            response += f"- **Database Type**: {host_info.get('db_type_cd', 'N/A')}\n"
            response += f"- **Version**: {host_info.get('version_num', 'N/A')}\n"
            response += f"- **Status**: {host_info.get('resource_status', 'N/A')}\n"
            response += f"- **Location**: {host_info.get('location', 'N/A')}\n\n"
        
        response += f"**Patches Found**: {len(patches)}\n\n"
        
        for i, patch in enumerate(patches, 1):
            response += f"### 🔧 Patch {i}\n"
            response += f"- **Patch ID**: {patch.get('patch_id', 'N/A')}\n"
            response += f"- **Version**: {patch.get('patch_version', 'N/A')}\n"
            response += f"- **Type**: {patch.get('patch_type', 'N/A')}\n"
            response += f"- **Status**: {patch.get('patch_status', 'N/A')}\n"
            response += f"- **Applied Date**: {patch.get('applied_ts', 'N/A')}\n"
            response += f"- **Details**: {patch.get('patch_details', 'N/A')}\n\n"
        
        return response
    
    def _format_no_patches_message(self, hostname: str, host_info: Dict = None) -> str:
        """Format message when host exists but no patches are found."""
        
        response = f"## 📋 Patch Information for **{hostname}**\n\n"
        
        # Add host information if available
        if host_info:
            response += f"**Host Details:**\n"
            response += f"- **Resource Name**: {host_info.get('resource_nm', 'N/A')}\n"
            response += f"- **Database Type**: {host_info.get('db_type_cd', 'N/A')}\n"
            response += f"- **Version**: {host_info.get('version_num', 'N/A')}\n"
            response += f"- **Status**: {host_info.get('resource_status', 'N/A')}\n"
            response += f"- **Location**: {host_info.get('location', 'N/A')}\n\n"
        
        response += f"✅ **Host found** but no patches have been applied to this system.\n\n"
        response += f"This could mean:\n"
        response += f"• The system is newly deployed and hasn't received patches yet\n"
        response += f"• Patches are managed through a different system\n"
        response += f"• The system is up to date with the latest version\n\n"
        response += f"Contact the database team if you need more information about patch management for this host."
        
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