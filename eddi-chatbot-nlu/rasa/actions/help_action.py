from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
import logging

logger = logging.getLogger(__name__)


class ActionDynamicHelp(Action):
    """Dynamic help action that shows different menus based on X-Source-Id header"""

    def name(self) -> Text:
        return "action_dynamic_help"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        # Extract auth headers from tracker metadata
        auth_headers = self._extract_auth_headers(tracker)
        source_id = auth_headers.get('X-Source-Id', 'unknown')
        user_role = auth_headers.get('X-User-Role', 'user')

        logger.info(f"Dynamic help requested - Source: {source_id}, Role: {user_role}")

        # Get appropriate help menu based on source
        help_menu = self._get_help_menu_for_source(source_id, user_role)
        
        dispatcher.utter_message(
            text=help_menu['text'],
            buttons=help_menu['buttons']
        )

        return []

    def _extract_auth_headers(self, tracker: Tracker) -> Dict[str, Any]:
        """Extract auth headers from tracker latest message metadata"""
        try:
            if hasattr(tracker.latest_message, 'metadata') and tracker.latest_message.metadata:
                return tracker.latest_message.metadata.get('auth_headers', {})
            return {}
        except Exception as e:
            logger.error(f"Error extracting auth headers: {e}")
            return {}

    def _get_help_menu_for_source(self, source_id: str, user_role: str) -> Dict[str, Any]:
        """Return appropriate help menu based on source ID and user role"""
        
        if source_id == 'eddi':
            return self._get_eddi_help_menu(user_role)
        elif source_id == 'hoover':
            return self._get_hoover_help_menu(user_role)
        elif source_id == 'teams':
            return self._get_teams_help_menu(user_role)
        else:
            return self._get_default_help_menu()

    def _get_eddi_help_menu(self, user_role: str) -> Dict[str, Any]:
        """Help menu for EDDI source - limited features"""
        text = """Hello! I'm your Database Assistant for EDDI. I can help you with basic database operations.

Choose an option below to get started:"""
        
        buttons = [
            {"title": "Recommend a Database", "payload": "/recommend_database"},
            {"title": "Query Analyzer", "payload": "/analyze_query"},
            {"title": "Get Patch Information", "payload": "/get_patch_information"}
        ]

        # Add DBA-specific features for eddi-chatbot-dba role
        if user_role == 'eddi-chatbot-dba':
            buttons.extend([
                {"title": "Schema Explorer", "payload": "/explore_schema"},
                {"title": "Create Column", "payload": "/create_column"}
            ])

        return {"text": text, "buttons": buttons}

    def _get_hoover_help_menu(self, user_role: str) -> Dict[str, Any]:
        """Help menu for Hoover source - full features"""
        text = """Hello! I'm your Database Observability Assistant for Hoover. I can help you manage databases, analyze performance, and explore schemas across PostgreSQL, MySQL, and MongoDB.

Choose an option below to get started:"""
        
        buttons = [
            {"title": "Recommend a Database", "payload": "/recommend_database"},
            {"title": "Create Database", "payload": "/create_database"},
            {"title": "Delete Database", "payload": "/delete_database"},
            {"title": "Schema Explorer", "payload": "/explore_schema"},
            {"title": "Query Analyzer", "payload": "/analyze_query"},
            {"title": "Create Column", "payload": "/create_column"},
            {"title": "Drop Column", "payload": "/drop_column"},
            {"title": "Get Patch Information", "payload": "/get_patch_information"}
        ]

        # Filter based on user role
        if user_role not in ['eddi-chatbot-dba', 'hoover-admin']:
            # Remove destructive operations for non-admin users
            buttons = [btn for btn in buttons if btn['title'] not in ['Create Database', 'Delete Database', 'Drop Column']]

        return {"text": text, "buttons": buttons}

    def _get_teams_help_menu(self, user_role: str) -> Dict[str, Any]:
        """Help menu for Teams source - collaboration-focused features"""
        text = """Hello! I'm your Database Assistant for Microsoft Teams. I can help you with database information and collaboration.

Choose an option below to get started:"""
        
        buttons = [
            {"title": "Recommend a Database", "payload": "/recommend_database"},
            {"title": "Schema Explorer", "payload": "/explore_schema"},
            {"title": "Query Analyzer", "payload": "/analyze_query"},
            {"title": "Get Patch Information", "payload": "/get_patch_information"}
        ]

        return {"text": text, "buttons": buttons}

    def _get_default_help_menu(self) -> Dict[str, Any]:
        """Default help menu for unknown sources"""
        text = """Hello! I'm your Database Observability Assistant. I can help you with basic database operations.

Choose an option below to get started:"""
        
        buttons = [
            {"title": "Recommend a Database", "payload": "/recommend_database"},
            {"title": "Query Analyzer", "payload": "/analyze_query"}
        ]

        return {"text": text, "buttons": buttons}