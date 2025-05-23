from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher

class ActionRestart(Action):
    def name(self) -> Text:
        return "action_restart"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(
        text= f"Let's start over with the database selection process"),
        buttons=[
                {"title": "Yes, create ticket", "payload": "/confirm_database_selection"},
                {"title": "No, let's try again", "payload": "/restart"}
                ]
        

        # Return plain dictionary for restart event
        return [{"event": "restart"}] 