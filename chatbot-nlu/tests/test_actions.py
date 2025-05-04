import pytest
from unittest.mock import MagicMock
from rasa_sdk.events import SlotSet
from rasa.actions.actions import (
    ActionRecommendDatabase,
    ActionSubmitRequest,
    ActionRestart,
    ActionProcessObjectList,
    ActionExportDefinition,
    ActionValidateTemplate,
)

# Define fixtures for tracker and dispatcher.
@pytest.fixture
def mock_tracker():
    return MagicMock()

@pytest.fixture
def mock_dispatcher():
    return MagicMock()


@pytest.mark.parametrize("db_type,expected_cost", [
    ("Structured data, vendor app", "$500.00 per month"),  
    ("Unstructured data", "$200.00 per month"),             
])
def test_action_recommend_database_different_types(mock_tracker, mock_dispatcher, db_type, expected_cost):
    """
    Test that the database recommendation returns the correct estimated cost.
    
    For unstructured data, ensure that the updated extraction logic correctly extracts "MongoDB"
    from a recommendation like "Single Instance with Snapshot (MongoDB)". Then, the expected cost
    of $200.00 per month should be applied.
    """
    action = ActionRecommendDatabase()
    # Set required slot values.
    mock_tracker.get_slot.side_effect = lambda slot: {
         "app_type": db_type,
         "feature_type": "Yes, Oracle-only" if "Structured" in db_type else "No",
         "downtime_tolerance": "Yes",
         "relationship_type": None,
    }.get(slot, None)
    
    result = action.run(mock_dispatcher, mock_tracker, {})
    # result[1] should be the SlotSet event for "estimated_cost"
    assert result[1]["value"] == expected_cost




def test_action_restart(mock_tracker, mock_dispatcher):
    """
    Test that the restart action sends the proper message and returns exactly [{"event": "restart"}].
    """
    action = ActionRestart()
    result = action.run(mock_dispatcher, mock_tracker, {})
    mock_dispatcher.utter_message.assert_called_once_with("Let's start over with the database selection process.")
    assert result == [{"event": "restart"}]


def test_action_process_object_list(mock_tracker, mock_dispatcher):
    """
    Test that object list processing returns a JSON message including the host and expected object names.
    """
    action = ActionProcessObjectList()
    mock_tracker.get_slot.side_effect = lambda slot: {
          "database_host_endpoint": "db.example.com",
          "database_type": "SQL",
          "object_types": ["Tables", "Views", "Indexes", "Constraints"],
    }.get(slot, None)
    
    action.run(mock_dispatcher, mock_tracker, {})
    # Extract the text from the uttered message.
    call_args = mock_dispatcher.utter_message.call_args
    output_message = call_args[1].get("text", "")
    assert "db.example.com" in output_message
    assert "users" in output_message  # Expect to see table names such as "users"


def test_action_process_empty_object_list(mock_tracker, mock_dispatcher):
    """
    Test that object list processing handles an empty list of object types.
    
    The JSON output should indicate empty lists (e.g. "'tables': []").
    """
    action = ActionProcessObjectList()
    mock_tracker.get_slot.side_effect = lambda slot: {
         "database_host_endpoint": "db.example.com",
         "database_type": "SQL",
         "object_types": [],
    }.get(slot, None)
    
    action.run(mock_dispatcher, mock_tracker, {})
    call_args = mock_dispatcher.utter_message.call_args
    output_message = call_args[1].get("text", "")
    assert "'tables': []" in output_message


def test_action_export_definition(mock_tracker, mock_dispatcher):
    """
    Test that the export definition action issues the expected utterance.
    
    The uttered message should exactly match the expected notification message.
    """
    action = ActionExportDefinition()
    mock_tracker.get_slot.side_effect = lambda slot: {
         "database_host_endpoint": "db.example.com",
    }.get(slot, None)
    
    action.run(mock_dispatcher, mock_tracker, {})
    mock_dispatcher.utter_message.assert_called_once_with(
    text="Your database definition has been exported in JSON format. You can download it from your notification center.")



def test_action_validate_template(mock_tracker, mock_dispatcher):
    """
    Test that the validate template action returns a SlotSet event marking template_valid as True
    when the latest message contains the word "template".
    """
    action = ActionValidateTemplate()
    mock_tracker.latest_message = {"text": "This is a template example."}
    result = action.run(mock_dispatcher, mock_tracker, {})
    assert any(event.get("value") is True for event in result if event.get("event") == "slot")


def test_action_validate_template_unknown(mock_tracker, mock_dispatcher):
    """
    Test that the validate template action returns a SlotSet event marking template_valid as False
    when the latest message does not indicate a template.
    """
    action = ActionValidateTemplate()
    mock_tracker.latest_message = {"text": ""}
    mock_tracker.get_slot.side_effect = lambda slot: {
         "recommended_database": "PostgreSQL",
         "template_name": None,
         "template_version": None,
    }.get(slot, None)
    result = action.run(mock_dispatcher, mock_tracker, {})
    assert any(event.get("value") is False for event in result if event.get("event") == "slot")
