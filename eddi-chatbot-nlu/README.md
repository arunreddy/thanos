# EDDI Chatbot NLU (Rasa)

This directory contains the Rasa NLU (Natural Language Understanding) component of the EDDI chatbot system. Rasa handles intent recognition, entity extraction, and conversation management.

## Prerequisites

- Python 3.8+
- pip or uv package manager
- Rasa CLI
- PostgreSQL database (for patch information actions)

## Installation

### Option 1: Using pip
```bash
pip install rasa
```

### Option 2: Using uv (recommended)
```bash
uv sync
```

## Database Setup

The patch information action requires a PostgreSQL database. You can configure the connection using environment variables or use the default values.

### Environment Variables

The system supports the following environment variables for database configuration:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL server hostname |
| `DB_PORT` | `5432` | PostgreSQL server port |
| `DB_NAME` | `dbq` | Database name |
| `DB_USER` | `dbowner` | Database username |
| `DB_PASSWORD` | `dbq_password_2024` | Database password |

### Configuration Methods

#### Method 1: Environment Variables (Recommended)
```bash
# Set environment variables
export DB_HOST=your-db-server.com
export DB_PORT=5432
export DB_NAME=your_database
export DB_USER=your_username
export DB_PASSWORD=your_secure_password

# Or create a .env file
cp env.example .env
# Edit .env with your actual values
```

#### Method 2: Default Values
If no environment variables are set, the system uses these defaults:
- **Host**: localhost
- **Port**: 5432
- **Database**: dbq
- **User**: dbowner
- **Password**: dbq_password_2024

### Database Schema

The system expects the following tables in the `dbq` schema:

1. **`dbq.inventory`** - Contains host information
2. **`dbq.patches`** - Contains patch information

### Testing Database Connection

Before running Rasa, test your database connection:

```bash
# From the eddi-chatbot-nlu directory
python test_db_connection.py
```

This script will:
- Test the database connection
- Verify required tables exist
- Check sample data
- Test patch information queries

### Checking Database Configuration

To verify which database configuration is being used:

```bash
# Show current configuration
python show_db_config.py

# Test with specific environment variables
DB_HOST=your-host DB_PORT=5432 DB_NAME=your-db DB_USER=your-user DB_PASSWORD=your-pass python show_db_config.py
```

### Testing Patch Information Flow

To test the complete patch information flow:

```bash
# Test the patch information retrieval
python test_patch_flow.py
```

This script tests:
- Hostname validation
- Patch information retrieval
- Error handling for non-existent hosts

## Running Rasa Locally

### 1. Start the Action Server
The action server handles custom actions. Run this in a separate terminal:

```bash
# From the eddi-chatbot-nlu directory
rasa run actions --port 5055
```

### 2. Start Rasa Shell (Interactive Testing)
Test your bot interactively:

```bash
# From the eddi-chatbot-nlu directory
rasa shell
```

### 3. Start Rasa Server (API Mode)
Run Rasa as a server for API calls:

```bash
# From the eddi-chatbot-nlu directory
rasa run --port 5005 --cors "*"
```

### 4. Train the Model
After making changes to training data or domain:

```bash
# From the eddi-chatbot-nlu directory
rasa train
```

## Adding a New Custom Action

Follow these steps to add a new custom action to your Rasa bot:

### Step 1: Create the Action File

Create a new Python file in `rasa/actions/` directory:

```python
# rasa/actions/your_new_action.py
from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher

class ActionYourNewAction(Action):
    def name(self) -> Text:
        return "action_your_new_action"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Your action logic here
        dispatcher.utter_message(text="Your response message")
        
        return []
```

### Step 2: Update Domain Configuration

Add your action to `rasa/domain.yml`:

```yaml
actions:
  - action_your_new_action
  # ... other actions

intents:
  - your_new_intent
  # ... other intents

entities:
  - your_entity
  # ... other entities

slots:
  your_slot:
    type: text
    mappings:
    - type: from_entity
      entity: your_entity
  # ... other slots

responses:
  utter_your_response:
    - text: "Your response message"
  # ... other responses

rules:
  - rule: Your rule name
    steps:
    - intent: your_new_intent
    - action: action_your_new_action
  # ... other rules
```

### Step 3: Add Training Data

Update `rasa/data/nlu.yml` with intent examples:

```yaml
nlu:
  - intent: your_new_intent
    examples: |
      - I want to [do something](your_entity)
      - Can you help me with [something](your_entity)
      - [Something](your_entity) please
```

Update `rasa/data/stories.yml` for conversation flows:

```yaml
stories:
  - story: your story name
    steps:
    - intent: your_new_intent
    - action: action_your_new_action
```

### Step 4: Train and Test

1. Train the model:
```bash
rasa train
```

2. Test your action:
```bash
rasa shell
```

## Database-Enabled Actions

### Patch Information Action

The patch information action queries a PostgreSQL database to provide real-time patch information for database hosts.

#### Features:
- **Host Validation**: Checks if the hostname exists in the inventory
- **Patch Information**: Retrieves applied patches with details
- **Host Details**: Shows database type, version, status, and location
- **Error Handling**: Graceful handling of database errors and missing data

#### Database Queries:
- **Host Check**: `SELECT COUNT(*) FROM dbq.inventory WHERE host_nm = %s`
- **Patch Info**: `SELECT i.*, p.* FROM dbq.inventory i LEFT JOIN dbq.patches p ON i.resource_id = p.resource_id WHERE i.host_nm = %s`
- **Host Info**: `SELECT resource_id, resource_nm, db_type_cd, host_nm, version_num, resource_status, location FROM dbq.inventory WHERE host_nm = %s`

#### Usage:
1. Ask for patch information: "I want patch information for postgres-prod-01.company.com"
2. Bot will validate the hostname
3. If found, display patch information
4. If not found, provide helpful error message

#### Example Response:
```
## 📋 Patch Information for postgres-prod-01.company.com

**Host Details:**
- Resource Name: postgres-prod-01
- Database Type: PostgreSQL
- Version: 15.4
- Status: Online
- Location: us-east-1

**Patches Found**: 2

### 🔧 Patch 1
- Patch ID: 1
- Version: 15.4.1
- Type: SECURITY
- Status: APPLIED
- Applied Date: 2024-01-10 02:00:00
- Details: Security patch for CVE-2024-1234
```

## Example: Patch Information Action

Here's a complete example of the patch information action:

### Action Implementation (`rasa/actions/patch_information.py`)

```python
from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
from .db_utils import db_connection

class ActionGetPatchInformation(Action):
    def name(self) -> Text:
        return "action_get_patch_information"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        hostname = tracker.get_slot("hostname")
        
        if not hostname:
            dispatcher.utter_message(text="Please provide a hostname to check patch information.")
            return []
        
        # Check if hostname exists
        if not db_connection.check_hostname_exists(hostname):
            dispatcher.utter_message(text=f"Hostname '{hostname}' not found in inventory.")
            return []
        
        # Get patch information
        patches = db_connection.get_patch_information(hostname)
        
        if patches:
            response = self._format_patch_information(patches, hostname)
            dispatcher.utter_message(text=response)
        else:
            dispatcher.utter_message(text=f"No patches found for hostname '{hostname}'.")
        
        return []
```

### Domain Configuration

```yaml
intents:
  - get_patch_information
  - inform_hostname

entities:
  - hostname

slots:
  hostname:
    type: text
    mappings:
    - type: from_entity
      entity: hostname

responses:
  utter_ask_hostname:
    - text: "Please provide the hostname you want to check patch information for."

rules:
  - rule: Patch information flow
    steps:
    - intent: get_patch_information
    - action: utter_ask_hostname
    - intent: inform_hostname
    - action: action_get_patch_information
```

### Training Data

```yaml
# nlu.yml
nlu:
  - intent: get_patch_information
    examples: |
      - I want patch information for [server01](hostname)
      - Check patches for [hostname](hostname)
      - What patches are installed on [machine](hostname)
      - Show me patch status for [server](hostname)

  - intent: inform_hostname
    examples: |
      - [server01](hostname)
      - [hostname](hostname)
      - [machine](hostname)
      - [server](hostname)
```

## Troubleshooting

### Port Conflicts
If you get port conflicts when running Rasa:

```bash
# Check what's using the port
lsof -i :5005
lsof -i :5055

# Kill the process or use different ports
rasa run --port 5006
rasa run actions --port 5056
```

### Model Training Issues
If training fails:

```bash
# Clean and retrain
rm -rf rasa/models/*
rasa train
```

### Action Server Issues
If actions aren't working:

1. Make sure action server is running
2. Check action names match in domain.yml
3. Verify Python syntax in action files

### Database Connection Issues
If database actions fail:

1. **Test connection**: Run `python test_db_connection.py`
2. **Check credentials**: Verify database user/password
3. **Check network**: Ensure PostgreSQL is running on localhost:5432
4. **Check schema**: Verify `dbq.inventory` and `dbq.patches` tables exist
5. **Check permissions**: Ensure user has SELECT permissions on required tables

Common database errors:
- `connection refused`: PostgreSQL not running
- `authentication failed`: Wrong username/password
- `relation does not exist`: Missing tables or wrong schema
- `permission denied`: Insufficient database permissions

## File Structure

```
eddi-chatbot-nlu/
├── rasa/
│   ├── actions/           # Custom action implementations
│   │   ├── db_utils.py    # Database connection utilities
│   │   └── patch_information.py
│   ├── data/              # Training data
│   │   ├── nlu.yml        # Intent and entity examples
│   │   ├── stories.yml    # Conversation flows
│   │   └── rules.yml      # Conversation rules
│   ├── config.yml         # Rasa configuration
│   ├── domain.yml         # Domain configuration
│   └── credentials.yml    # API credentials
├── tests/                 # Test files
├── test_db_connection.py  # Database connection test
└── README.md             # This file
```

## Development Workflow

1. **Set up database**: Ensure PostgreSQL is running with correct schema
2. **Test connection**: Run `python test_db_connection.py`
3. **Make changes** to training data, domain, or actions
4. **Train the model**: `rasa train`
5. **Test interactively**: `rasa shell`
6. **Start action server**: `rasa run actions`
7. **Iterate and improve**

## Integration with Docker

When running with Docker Compose, the action server runs automatically. For local development, you need to start it manually as described above.

**Note**: When using Docker, ensure the database connection is configured to reach the PostgreSQL container or external database.
