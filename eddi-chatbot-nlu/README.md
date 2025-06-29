# EDDI Chatbot NLU (Rasa)

This directory contains the Rasa NLU (Natural Language Understanding) component of the EDDI chatbot system. Rasa handles intent recognition, entity extraction, and conversation management.

## Prerequisites

- Python 3.8+
- pip or uv package manager
- Rasa CLI

## Installation

### Option 1: Using pip
```bash
pip install rasa
```

### Option 2: Using uv (recommended)
```bash
uv sync
```

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

## Example: Patch Information Action

Here's a complete example of the patch information action:

### Action Implementation (`rasa/actions/patch_information.py`)

```python
from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet

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
        
        # Mock data - replace with actual database query
        patch_data = {
            "hostname": hostname,
            "patches": [
                {"patch_id": "P001", "version": "1.2.3", "status": "Applied"},
                {"patch_id": "P002", "version": "1.2.4", "status": "Pending"}
            ]
        }
        
        response = f"Patch information for {hostname}:\n"
        for patch in patch_data["patches"]:
            response += f"- {patch['patch_id']}: {patch['version']} ({patch['status']})\n"
        
        dispatcher.utter_message(text=response)
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

## File Structure

```
eddi-chatbot-nlu/
├── rasa/
│   ├── actions/           # Custom action implementations
│   ├── data/              # Training data
│   │   ├── nlu.yml        # Intent and entity examples
│   │   ├── stories.yml    # Conversation flows
│   │   └── rules.yml      # Conversation rules
│   ├── config.yml         # Rasa configuration
│   ├── domain.yml         # Domain configuration
│   └── credentials.yml    # API credentials
├── tests/                 # Test files
└── README.md             # This file
```

## Development Workflow

1. **Make changes** to training data, domain, or actions
2. **Train the model**: `rasa train`
3. **Test interactively**: `rasa shell`
4. **Start action server**: `rasa run actions`
5. **Iterate and improve**

## Integration with Docker

When running with Docker Compose, the action server runs automatically. For local development, you need to start it manually as described above.
