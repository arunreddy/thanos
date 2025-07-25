import psycopg2
import json
import re
from datetime import datetime, timedelta
from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.forms import FormValidationAction
from rasa_sdk.events import SlotSet

class ActionGetDbMetricsSummary(Action):
    def name(self) -> Text:
        return "action_get_db_metrics_summary"

    def parse_time_period(self, time_period: str) -> tuple:
        """Parse time period and calculate start/end timestamps"""
        try:
            # Parse format like '1h', '30m', '2d'
            match = re.match(r'^(\d+)([hmd])$', time_period.lower())
            if not match:
                return None, None
            
            amount = int(match.group(1))
            unit = match.group(2)
            
            # Calculate timedelta
            if unit == 'h':
                delta = timedelta(hours=amount)
            elif unit == 'm':
                delta = timedelta(minutes=amount)
            elif unit == 'd':
                delta = timedelta(days=amount)
            else:
                return None, None
            
            # Calculate timestamps
            end_time = datetime.utcnow()
            start_time = end_time - delta
            
            # Format as ISO strings
            end_timestamp = end_time.strftime('%Y-%m-%dT%H:%M:%SZ')
            start_timestamp = start_time.strftime('%Y-%m-%dT%H:%M:%SZ')
            
            return start_timestamp, end_timestamp
            
        except Exception:
            return None, None

    def _generate_metrics_summary(self, metrics_data: dict, hostname: str, resource: str, 
                                time_period: str, start_time: str, end_time: str) -> str:
        """Generate a formatted summary of the metrics data"""
        try:
            # Check if the response was successful
            if metrics_data.get("status") != "success":
                return f"❌ Error: {metrics_data.get('message', 'Unknown error occurred')}"
            
            # Extract basic information
            record_count = metrics_data.get("record_count", 0)
            data = metrics_data.get("data", {})
            
            if not data:
                return "❌ No metrics data available for the specified time period."
            
            # Extract database information
            db_type = data.get("db_type_cd", "Unknown")
            version = data.get("version_num", "Unknown")
            status = data.get("resource_status", "Unknown")
            last_backup = data.get("last_backup_ts", "Unknown")
            
            # Process metrics
            metrics = data.get("metrics", [])
            if not metrics:
                return "📊 No metric values found for the specified time period."
            
            # Group metrics by metric name and calculate averages
            metric_groups = {}
            for metric in metrics:
                metric_name = metric.get("metric_nm", "unknown_metric")
                metric_value = metric.get("metric_val")
                unit_type = metric.get("unit_type", "")
                
                # Skip metrics without values or names
                if metric_value is None or not metric_name:
                    continue
                
                if metric_name not in metric_groups:
                    metric_groups[metric_name] = {
                        "values": [],
                        "unit": unit_type,
                        "count": 0
                    }
                
                metric_groups[metric_name]["values"].append(float(metric_value))
                metric_groups[metric_name]["count"] += 1
            
            # Generate summary message
            message = f"""## 📊 Database Metrics Summary

### 🏢 Database Information
- **Hostname:** {hostname}
- **Resource:** {resource}
- **Database Type:** {db_type}
- **Version:** {version}
- **Status:** {status}
- **Last Backup:** {last_backup}

### 📈 Metrics Analysis (Last {time_period})
- **Total Records:** {record_count}
- **Time Period:** {start_time} to {end_time}

"""
            
            # Add metric summaries
            if metric_groups:
                message += "### 📊 Metric Averages:\n\n"
                for metric_name, data in metric_groups.items():
                    values = data["values"]
                    unit = data["unit"]
                    count = data["count"]
                    
                    if values:
                        avg_value = sum(values) / len(values)
                        min_value = min(values)
                        max_value = max(values)
                        
                        # Format the average based on the metric type
                        if unit == "count":
                            avg_display = f"{avg_value:.1f}"
                        else:
                            avg_display = f"{avg_value:.2f}"
                        
                        message += f"**{metric_name.replace('_', ' ').title()}:**\n"
                        message += f"  - Average: {avg_display} {unit}\n"
                        message += f"  - Range: {min_value:.1f} - {max_value:.1f} {unit}\n"
                        message += f"  - Data Points: {count}\n\n"
            else:
                message += "⚠️ No valid metric data found in the response.\n"
                
            return message
            
        except Exception as e:
            return f"❌ Error processing metrics data: {str(e)}"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Get inputs from slots
        metrics_hostname = tracker.get_slot("metrics_hostname")
        resource_name = tracker.get_slot("resource_name")
        time_period = tracker.get_slot("time_period")
        
        # Validate inputs
        if not metrics_hostname:
            dispatcher.utter_message(text="❌ Error: Hostname is required")
            return []
        
        if not resource_name:
            dispatcher.utter_message(text="❌ Error: Resource name is required")
            return []
        
        if not time_period:
            dispatcher.utter_message(text="❌ Error: Time period is required")
            return []
        
        # Parse time period and calculate timestamps
        start_timestamp, end_timestamp = self.parse_time_period(time_period)
        if not start_timestamp or not end_timestamp:
            dispatcher.utter_message(text="❌ Error: Could not parse time period")
            return []
        
        # Hardcoded database credentials (replace with your actual credentials)
        POSTGRES_HOST = "your-postgres-host.company.com"
        POSTGRES_PORT = 5432
        POSTGRES_DATABASE = "dbq_psql"
        POSTGRES_USER = "your_username"
        POSTGRES_PASSWORD = "your_password"
        
        try:
            # Connect to the database using hardcoded credentials
            conn = psycopg2.connect(
                host=POSTGRES_HOST,
                port=POSTGRES_PORT,
                database=POSTGRES_DATABASE,
                user=POSTGRES_USER,
                password=POSTGRES_PASSWORD
            )
            cursor = conn.cursor()
            
            # Execute the metrics query using the provided hostname and resource name
            query = """
            SELECT dbq.fn_bot_get_metrics_json(
                in_host_nm     := %s,
                in_resource_nm := %s,
                in_start_ts    := %s,
                in_end_ts      := %s
            );
            """
            
            cursor.execute(query, (metrics_hostname, resource_name, start_timestamp, end_timestamp))
            result = cursor.fetchone()[0]
            
            # Parse JSON result
            metrics_data = json.loads(result) if isinstance(result, str) else result
            
            # Process and analyze the metrics data
            summary_message = self._generate_metrics_summary(
                metrics_data, metrics_hostname, resource_name, time_period, 
                start_timestamp, end_timestamp
            )
            
            dispatcher.utter_message(text=summary_message)
            
            cursor.close()
            conn.close()
            
            return [SlotSet("metrics_data", metrics_data)]
            
        except psycopg2.Error as e:
            dispatcher.utter_message(text=f"❌ Database connection error: {str(e)}")
            return []
        except Exception as e:
            dispatcher.utter_message(text=f"❌ Error retrieving metrics: {str(e)}")
            return []

class ValidateDbMetricsForm(FormValidationAction):
    def name(self) -> Text:
        return "validate_db_metrics_form"

    def validate_metrics_hostname(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate hostname format"""
        if not slot_value:
            return {"metrics_hostname": None}
        
        # Basic hostname validation (allow letters, numbers, dots, hyphens)
        hostname_pattern = r'^[a-zA-Z0-9.-]+$'
        
        if not re.match(hostname_pattern, slot_value.strip()):
            dispatcher.utter_message(
                text="Invalid hostname format. Please provide a valid hostname (e.g., postgres-prod-01.company.com)"
            )
            return {"metrics_hostname": None}
        
        return {"metrics_hostname": slot_value.strip()}

    def validate_resource_name(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate resource name format"""
        if not slot_value:
            return {"resource_name": None}
        
        # Allow letters, numbers, forward slashes, hyphens, underscores for resource names
        # This supports MongoDB Atlas resource names with forward slashes
        resource_pattern = r'^[a-zA-Z0-9/_-]+$'
        
        if not re.match(resource_pattern, slot_value.strip()):
            dispatcher.utter_message(
                text="Invalid resource name format. Please provide a valid resource name (e.g., my_database or 604b97f276d858654646dde3/atl-cm2-rcvatmn-fnd-p-2/local)"
            )
            return {"resource_name": None}
        
        return {"resource_name": slot_value.strip()}

    def validate_time_period(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        """Validate time period format"""
        if not slot_value:
            return {"time_period": None}
        
        # Validate format like 1h, 30m, 2d
        if re.match(r'^\d+[hmd]$', slot_value.lower()):
            return {"time_period": slot_value.lower()}
        else:
            dispatcher.utter_message(
                text="Please provide time period in format like '1h', '30m', or '2d'"
            )
            return {"time_period": None}