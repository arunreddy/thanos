from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
import psycopg2
import os
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT as ISO

class ActionSubmitDeleteDatabase(Action):
    def name(self) -> Text:
        return "action_submit_delete_database"

    def delete_database(self, hostname, db_name, sysid, comment="") -> str:
        connection_master = None
        connection_user = None
        
        try:

            # Connect to postgres with master user
            master_user = os.environ["EDDI_MASTER_DB_POSTGRES15_USER"]
            master_pass = "Ea1&BVwqS1jfzLP" #os.environ["EDDI_MASTER_DB_POSTGRES15_PASS"]
            
            print(f"Connecting to master database with user '{master_user}' and password '{master_pass}'")
            connection_master = psycopg2.connect(
                host=hostname,
                port=5438,
                user=master_user,
                password=master_pass,
                database="postgres"
            )
            connection_master.set_isolation_level(ISO)
            cursor_master = connection_master.cursor()
            
            for i in range(3):
            
                # Terminate the connections to the database
                cursor_master.execute(
                    f"""select pid, pg_Terminate_backend(pid) from pg_stat_activity where datname='{db_name}' and pid <> pg_backend_pid();""",
                )
                
                # get rows
                rows = cursor_master.fetchall()
                if not rows:
                    print(f"No connections to database '{db_name}' found.")
                    break
                else:
                    print(f"Terminated connections to database '{db_name}': {rows}")
                    
                print(f"Terminated connections to database '{db_name}' in host {hostname}.")
                
            
            # query = f"DROP DATABASE IF EXISTS {db_name};"
            # print(f"Executing query: {query}")
            # cursor_master.execute(query=query)
            # print(f"Database '{db_name}' dropped successfully.")
            
                
            # cursor_master.close()
            # connection_master.close()
            # print("Master database connection closed.")
            
            db_user = os.environ["EDDI_CREATE_DB_POSTGRES_USER"]
            db_pass = os.environ["EDDI_CREATE_DB_POSTGRES_PASS"]
            
            print(f"Connecting to database '{db_name}' with user '{db_user}' and password '{db_pass}'")
            
            # Connect to postgres with user
            connection_user = psycopg2.connect(
                host=hostname,
                port=5438,
                user=db_user,
                password=db_pass,
                database="postgres"
            )
            connection_user.autocommit = True
            cursor_user = connection_user.cursor()
            # Drop the database            
            query = f"DROP DATABASE IF EXISTS {db_name};"
            print(f"Executing query: {query}")
            cursor_user.execute(query=query)
            print(f"Database '{db_name}' dropped successfully.")
            
            return f"Your request for deleting {db_name} on {hostname} is complete."

        except psycopg2.DatabaseError as e:
            return f"An error occurred while creating the database: {e}"
        except Exception as e:
            return f"An unexpected error occurred: {e}"
        finally:
            
            if connection_master:
                cursor_master.close()
                connection_master.close()
                print("=> Master database connection closed.")
            
            # if connection_user:
            #     cursor_user.close()
            #     connection_user.close()
            #     print("Database connection closed.")

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: dict
    ) -> List[dict]:
        db_name    = tracker.get_slot("database_name")
        database_instance = tracker.get_slot("database_instance")
        sysid      = tracker.get_slot("sysid")
        
        print(f"Deleting database {db_name} {database_instance} for SysID {sysid}")
        
        # Delete the database
        response = self.delete_database(
            hostname=database_instance,
            db_name=db_name,
            sysid=sysid
        )
        print(f"Deleting database {db_name} for SysID {sysid}")

        dispatcher.utter_message(
          text=response or "An error occurred while deleting the database. Please try again later."
        )
        return [] 
