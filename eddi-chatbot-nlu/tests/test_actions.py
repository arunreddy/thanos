import pytest
from eddi.actions import (
    recommend_database,
    start_database,
    stop_database,
    check_database_status,
    backup_database,
    restore_database,
    list_available_databases,
    optimize_database,
    get_table_names,
    get_table_schema,
    get_database_schema,
    get_view_names,
    get_view_definition,
    get_object_names,
    get_object_type,
    create_jira_ticket,
    get_jira_ticket_status,
    create_service_now_incident,
    get_service_now_incident_status,
    generate_select_query,
    generate_insert_query,
    generate_update_query,
    generate_delete_query,
)

def test_get_table_names():
    assert get_table_names("PostgreSQL") == ["users", "orders", "products"]
    
def test_get_database_schema():
    # Updated expected output to match the new implementation
    assert get_database_schema("PostgreSQL") == {
        "tables": ["users", "orders", "products"],
        "views": ["active_users_view", "sales_summary_view"],
        "functions": ["calculate_discount", "get_user_activity"]
    }
    
def test_get_view_names():
    # Updated expected output to match the new implementation
    assert get_view_names("PostgreSQL") == ["active_users_view", "sales_summary_view"]
    
def test_get_object_names():
    # Updated expected output to match the new implementation
    assert get_object_names("PostgreSQL") == [
        "users", "orders", "products",
        "active_users_view", "sales_summary_view",
        "calculate_discount", "get_user_activity"
    ]
        
def test_recommend_database():
    assert recommend_database({'type': 'relational'}) == "PostgreSQL"
    assert recommend_database({'type': 'nosql'}) == "MongoDB"
    assert recommend_database({'type': 'other'}) == "SQLite"

def test_start_database():
    assert start_database("PostgreSQL") == "Database 'PostgreSQL' started successfully."

def test_stop_database():
    assert stop_database("PostgreSQL") == "Database 'PostgreSQL' stopped successfully."

def test_check_database_status():
    assert check_database_status("PostgreSQL") == "Database 'PostgreSQL' is currently running."

def test_backup_database():
    assert backup_database("PostgreSQL", "/backups/postgresql.bak") == \
           "Database 'PostgreSQL' backed up successfully to '/backups/postgresql.bak'."

def test_restore_database():
    assert restore_database("PostgreSQL", "/backups/postgresql.bak") == \
           "Database 'PostgreSQL' restored successfully from '/backups/postgresql.bak'."

def test_list_available_databases():
    assert list_available_databases() == ["PostgreSQL", "MongoDB", "SQLite"]

def test_optimize_database():
    assert optimize_database("PostgreSQL") == "Database 'PostgreSQL' optimized successfully."

def test_recommend_database():
    assert recommend_database({'type': 'relational'}) == "PostgreSQL"
    assert recommend_database({'type': 'nosql'}) == "MongoDB"
    assert recommend_database({'type': 'other'}) == "SQLite"

def test_start_database():
    assert start_database("PostgreSQL") == "Database 'PostgreSQL' started successfully."

def test_stop_database():
    assert stop_database("PostgreSQL") == "Database 'PostgreSQL' stopped successfully."

def test_check_database_status():
    assert check_database_status("PostgreSQL") == "Database 'PostgreSQL' is currently running."

def test_backup_database():
    assert backup_database("PostgreSQL", "/backups/postgresql.bak") == \
           "Database 'PostgreSQL' backed up successfully to '/backups/postgresql.bak'."

def test_restore_database():
    assert restore_database("PostgreSQL", "/backups/postgresql.bak") == \
           "Database 'PostgreSQL' restored successfully from '/backups/postgresql.bak'."

def test_list_available_databases():
    assert list_available_databases() == ["PostgreSQL", "MongoDB", "SQLite"]

def test_optimize_database():
    assert optimize_database("PostgreSQL") == "Database 'PostgreSQL' optimized successfully."

def test_recommend_database():
    assert recommend_database({'type': 'relational', 'size': 50, 'performance': 'standard'}) == "PostgreSQL"
    assert recommend_database({'type': 'relational', 'size': 200, 'performance': 'high'}) == "Amazon Aurora"
    assert recommend_database({'type': 'nosql', 'size': 300, 'performance': 'standard'}) == "MongoDB"
    assert recommend_database({'type': 'nosql', 'size': 600, 'performance': 'high'}) == "DynamoDB"
    assert recommend_database({'type': 'in-memory'}) == "Redis"
    assert recommend_database({'type': 'unknown'}) == "SQLite"

def test_get_table_schema():
    assert get_table_schema("PostgreSQL", "users") == {"id": "int", "name": "varchar", "email": "varchar", "created_at": "timestamp"}
    with pytest.raises(ValueError, match="Table 'nonexistent' does not exist in database 'PostgreSQL'."):
        get_table_schema("PostgreSQL", "nonexistent")

def test_get_view_definition():
    assert get_view_definition("PostgreSQL", "active_users_view") == "SELECT id, name FROM users WHERE active = 1"
    with pytest.raises(ValueError, match="View 'nonexistent_view' does not exist in database 'PostgreSQL'."):
        get_view_definition("PostgreSQL", "nonexistent_view")

def test_get_object_type():
    assert get_object_type("PostgreSQL", "users") == "table"
    assert get_object_type("PostgreSQL", "active_users_view") == "view"
    assert get_object_type("PostgreSQL", "nonexistent_object") == "Unknown"

def test_create_jira_ticket():
    # Test with default priority
    result = create_jira_ticket("PROJ", "Fix critical bug", "This is an urgent issue.", "Bug")
    assert "priority 'High'" in result
    # Test with low priority
    result = create_jira_ticket("PROJ", "Minor UI issue", "This is a trivial issue.", "Task")
    assert "priority 'Low'" in result
    # Test with medium priority
    result = create_jira_ticket("PROJ", "Regular task", "This is a standard task.", "Task")
    assert "priority 'Medium'" in result

def test_get_jira_ticket_status():
    assert get_jira_ticket_status("JIRA-101") == "Status of Jira ticket 'JIRA-101' is 'In Progress'."
    assert get_jira_ticket_status("JIRA-102") == "Status of Jira ticket 'JIRA-102' is 'Resolved'."
    assert get_jira_ticket_status("JIRA-999") == "Status of Jira ticket 'JIRA-999' is 'Unknown'."

def test_create_service_now_incident():
    # Test with high priority
    result = create_service_now_incident("Critical outage", "System failure affecting all users.")
    assert "priority 'High'" in result
    # Test with default priority
    result = create_service_now_incident("Minor issue", "This is a minor issue.")
    assert "priority 'Low'" in result

def test_get_service_now_incident_status():
    assert get_service_now_incident_status("INC001") == "Status of ServiceNow incident 'INC001' is 'Resolved'."
    assert get_service_now_incident_status("INC002") == "Status of ServiceNow incident 'INC002' is 'In Progress'."
    assert get_service_now_incident_status("INC999") == "Status of ServiceNow incident 'INC999' is 'Unknown'."

def test_generate_select_query():
    # Test SELECT with all columns
    query = generate_select_query("users")
    assert query == "SELECT * FROM users"
    # Test SELECT with specific columns
    query = generate_select_query("users", columns=["id", "name"])
    assert query == "SELECT id, name FROM users"
    # Test SELECT with conditions
    query = generate_select_query("users", columns=["id", "name"], conditions={"id": 1, "active": True})
    assert query == "SELECT id, name FROM users WHERE id = '1' AND active = 'True'"

def test_generate_insert_query():
    # Test INSERT with data
    query = generate_insert_query("users", {"id": 1, "name": "John", "email": "john@example.com"})
    assert query == "INSERT INTO users (id, name, email) VALUES ('1', 'John', 'john@example.com')"

def test_generate_update_query():
    # Test UPDATE with data and conditions
    query = generate_update_query("users", {"name": "John Doe"}, {"id": 1})
    assert query == "UPDATE users SET name = 'John Doe' WHERE id = '1'"

def test_generate_delete_query():
    # Test DELETE with conditions
    query = generate_delete_query("users", {"id": 1, "active": False})
    assert query == "DELETE FROM users WHERE id = '1' AND active = 'False'"