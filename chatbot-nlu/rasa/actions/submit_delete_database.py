from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher

class ActionSubmitDeleteDatabase(Action):
    def name(self) -> Text:
        return "action_submit_delete_database"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: dict
    ) -> List[dict]:
        db_name    = tracker.get_slot("database_name")
        db_instance = tracker.get_slot("database_instance")
        sysid      = tracker.get_slot("sysid")

        # TODO: call your delete API / issue ticket, etc.
        dispatcher.utter_message(
            text=(
                f"Your request to delete *{db_name}* "
                f"instance *{db_instance}* with SYSID *{sysid}* has been submitted!"
            )
        )
        return [] 