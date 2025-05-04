from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker, FormValidationAction
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.types import DomainDict
import re


class ActionSubmitDatabase(Action):
    def name(self) -> Text:
        return "action_submit_database"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: dict
    ) -> List[dict]:
        db_name     = tracker.get_slot("database_name")
        db_version  = tracker.get_slot("database_version")
        sysid       = tracker.get_slot("sysid")

        # call your provisioning API / create ticket / etc.
        dispatcher.utter_message(
            text=(
                f"Your request to create *{db_name}* "
                f"version *{db_version}* with SysID *{sysid}* has been submitted!"
            )
        )

        return [] 
    
class ValidateCreateDatabaseForm(FormValidationAction):
    def name(self) -> Text:
        return "validate_create_database_form"

    def validate_database_name(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        """Validate database_name value."""
        # Define a regex pattern for valid database names
        # This example allows alphanumeric chars, underscores, and hyphens
        # Starts with letter, 3-63 chars long
        pattern = re.compile(r'^[a-zA-Z][a-zA-Z0-9_-]{2,62}$')
        
        if not pattern.match(slot_value):
            dispatcher.utter_message(
                text="Invalid database name. Names must start with a letter, "
                     "contain only letters, numbers, underscores, and hyphens, "
                     "and be 3-63 characters long. Please try again."
            )
            return {"database_name": None}
        
        return {"database_name": slot_value}