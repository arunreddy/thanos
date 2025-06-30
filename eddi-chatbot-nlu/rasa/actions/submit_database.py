from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker, FormValidationAction
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.types import DomainDict
import re
import psycopg2
import os

class ActionSubmitDatabase(Action):
    def name(self) -> Text:
        return "action_submit_database"
    
    def create_database(self, dbinstance, user, password, db_name, sysid, comment="") -> str:
        
        host_mapping = {
                "postgresql15": "vpce-0270f3c0158dd7a16-p5ge0niv.vpce-svc-09feb146094427ddb.us-east-1.vpce.amazonaws.com",
                "postgresql16": "vpce-04c1aaf8f71366ab5-hdulfwyz.vpce-svc-070c51070782f60e2.us-east-1.vpce.amazonaws.com",
            }
        host = host_mapping.get(dbinstance, "default-host-value")
        connection = None
        
        try:
            
            connection = psycopg2.connect(
                host=host,
                port=5438,
                user=user,
                password=password,
                database="postgres"
            )
            connection.autocommit = True
            
            cursor = connection.cursor()
                
            # Create the new database
            cursor.execute(f"CREATE DATABASE {db_name}")
            print(f"Database '{db_name}' created successfully.")
            # Add a comment to the newly created database
            cursor.execute(f"COMMENT ON DATABASE {db_name} IS '{comment}'")
            
            return f"""Your request for {db_name} on {host} is complete. Please submit the NHA request in [ServiceNow](https://citizensfgprod.service-now.com/now/nav/ui/classic/params/target/%2Fcom.glideapp.servicecatalog_cat_item_view.do%3Fv%3D1%26sysparm_id%3D5fda766f9739b1d0cb78fbbe2153afa2)"""

        except psycopg2.DatabaseError as e:
            return f"An error occurred while creating the database: {e}"
        except Exception as e:
            return f"An unexpected error occurred: {e}"
        finally:
            if connection:
                cursor.close()
                connection.close()
                print("Database connection closed.")


    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: dict
    ) -> List[dict]:
        db_name     = tracker.get_slot("database_name")
        db_version  = tracker.get_slot("database_version")
        sysid       = tracker.get_slot("sysid")
        
        print(f"Creating database {db_name} with version {db_version} for SysID {sysid}")
        
        response = self.create_database(
            dbinstance=db_version,
            user=os.getenv("EDDI_CREATE_DB_POSTGRES_USER"),
            password=os.getenv("EDDI_CREATE_DB_POSTGRES_PASS"),
            db_name=db_name,
            sysid=sysid,
            comment=f"Database created by EDDI for SysID {sysid}"
        )
        
        # call your provisioning API / create ticket / etc.
        dispatcher.utter_message(text=response or "An error occurred while creating the database. Please try again later.")

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