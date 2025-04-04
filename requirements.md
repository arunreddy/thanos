# Database Chatbot System

## Query Performance Analyzer
### Overview
The Query Performance Analyzer chatbot helps users analyze SQL query execution plans for performance tuning. Users can submit their SQL queries, select various options, and receive detailed execution plans in their preferred format.

### Initial Setup
#### Domain Configuration
Define intents, entities, slots, responses, and actions to handle user interactions. This includes setting up the chatbot to recognize different types of user inputs and respond appropriately.

### Conversation Flow
#### Initial Message
Message: Welcome to the Query Performance Analyzer! Submit your SQL query to retrieve the execution plan and analyze query performance.
For further assistance, contact the Database Operations Team at [DB Ops Email ID].
Type "BACK" anytime to go to action type selection.
Type "EXIT" anytime to end the conversation.

#### Action Type Selection
Question: Please select the environment.
Options:
- Dev (P1)
- QA (P2)
- Prod (P3)

#### Database Host Endpoint
Question: Please provide the database host endpoint.
Validation: Check if the database exists in the selected environment.
Response:
- If valid: Proceed to the next question.
- If invalid: Display message: Database {database name} provided does not exist in the {env}.

Question: Please select your database type.
Options:
- MongoDB
- Oracle
- MySQL
- SQL Server
- PostgreSQL
- DB2

Question: Please select the output file format.
Options:
- JSON
- Graphical

Question: Please enter the SQL query you want to analyze.
Validation: Check if the query is valid SQL syntax.
Response:
- If valid: Display message: Request in Progress... Please wait while we analyze your query. Proceed to execution plan retrieval. Provide a link to download the execution plan file.
- If invalid: Display message: Invalid SQL syntax. Please re-enter a valid query.

#### Execution Plan Retrieval
Action:
- Execute the EXPLAIN or equivalent command to retrieve the query execution plan.
- Format the execution plan into the requested output file (JSON or Graphical format).
- Store the generated execution plan file temporarily for download.

## Database Schema Explorer
### Overview
The Database Schema Explorer chatbot enables users to retrieve detailed database schema definitions. This feature provides comprehensive insights into various database objects like tables, indexes, constraints, relationships, views, etc. Users can select specific database objects to collectively retrieve the definition in JSON format.

### Initial Setup
#### Domain Configuration
Define intents, entities, slots, responses, and actions to handle user interactions. This includes setting up the chatbot to recognize different types of user inputs and respond appropriately.

### Conversation Flow
#### Initial Message
Message: Welcome to the Database Schema Explorer! Retrieve detailed database schema definitions, including tables, views, and indexes.
For further assistance, contact the Database Operations Team at [DB Ops Email ID].
Type "BACK" anytime to go to action type selection.
Type "EXIT" anytime to end the conversation.

#### Action Type Selection
Question: What would you like to do?
Options:
- Retrieve database object list
  1. Object List
- Export definition of database objects
  2. Export definition

#### Object List:
##### Platform Host Selection
Question: Please provide the database host endpoint along with port.
Validation: Check whether the user is associated with the database using SYSID.
Response:
- If valid: Proceed.
- If invalid: Return "Access Denied". Please contact {DB Ops Email ID}.

##### Database Type Selection
Question: Please provide the type of the database.
Options:
- MongoDB
- Oracle
- MySQL
- SQL Server
- PostgreSQL
- DB2

##### Object Type Selection
Question: What types of objects would you like to include in the list?
Options:
- Tables
- Views
- Indexes
- Constraints
- Relationships

##### Confirmation
Question: You have selected the following. Please confirm to proceed.
Details:
- Environment: {Environment}
- Database Type: {Database Type}
- Database: {Database Host Endpoint}
- Object Types: {Object Types}

Output: Click the link to download the object list template.

##### Rasa Action
Process the user request and return the output in JSON format.

JSON Output Format:
```json
{
    "comments": "Review the object lists and keep only the required objects",
    "database_host_endpoint": "dbname.rds.amazonaws.com:xxxx",
    "objects": {
        "tables": ["users", "orders", "products"],
        "views": ["active_users", "inactive_users"],
        "indexes": ["users_username_idx", "orders_date_idx"],
        "constraints": ["users_pk", "orders_user_fk"]
    }
}
```

#### Export Definition:
##### Upload Export Template
Question: Please upload the database object template file.
Validation: Validate template structure.
Response:
- If valid: Proceed.
- If invalid: Return "Invalid template structure. Do you want to restart?". If yes, go to Object List. If no, display a friendly message.

Validation: Check whether the user is associated with the database using SYSID.
Response:
- If valid: Proceed.
- If invalid: Return "Access Denied".

Output: Click the link to download the database objects definition.

##### Rasa Action
Process the user request and return the output in JSON format.

JSON Output Format:
```json
{
    "database_host_endpoint": "dbname.rds.amazonaws.com:xxxx",
    "definitions": {
        "tables": [
            {
                "name": "users",
                "columns": [
                    {"name": "id", "type": "int", "nullable": false},
                    {"name": "username", "type": "varchar(255)", "nullable": false},
                    {"name": "email", "type": "varchar(255)", "nullable": false}
                ]
            }
        ],
        "views": [
            {
                "name": "active_users",
                "query": "SELECT id, username, email FROM users WHERE active = true"
            }
        ],
        "indexes": [
            {
                "name": "users_username_idx",
                "columns": ["username"],
                "type": "unique"
            }
        ],
        "constraints": [
            {
                "type": "PRIMARY KEY",
                "table": "users",
                "columns": ["id"]
            }
        ]
    }
}
```

### Database Type Object List

| Object Type | MongoDB | Oracle | MySQL | SQL Server | PostgreSQL | DB2 |
|-------------|---------|--------|-------|------------|------------|-----|
| Tables | Collections | Tables | Tables | Tables | Tables | Tables |
| Indexes | Indexes | Indexes | Indexes | Indexes | Indexes | Indexes |
| Constraints | - | Constraints | Constraints | Constraints | Constraints | Constraints |
| Views | Views | Views | Views | Views | Views | Views |
| Materialized Views | - | Materialized Views | - | Indexed Views | Materialized Views | MQTs |
| Stored Procedures | - | Procedures | Procedures | Procedures | Procedures | Procedures |
| Functions | - | Functions | Functions | Functions | Functions | Functions |
| Triggers | - | Triggers | Triggers | Triggers | Triggers | Triggers |
| Sequences | - | Sequences | - | Sequences | Sequences | Sequences |
| Schemas | - | Schemas | - | Schemas | Schemas | Schemas |

Reference:
Database Port Number: Port Number - Database as a Service - Confluence

## Database Resource Management
### Overview
The Database Resource Management chatbot enables users to manage database resources effectively. This feature is limited to the P2 (Dev) environment ONLY.

### Initial Setup
#### Domain Configuration
Define intents, entities, slots, responses, and actions to handle user interactions. This includes setting up the chatbot to recognize different types of user inputs and respond appropriately.

### Conversation Flow
#### Initial Message
Message: Welcome to the Database Resource Management! Manage database services by checking status and retrieving resource information.
For further assistance, contact the Database Operations Team at [DB Ops Email ID].
Type "BACK" anytime to go to action type selection.
Type "EXIT" anytime to end the conversation.

#### Action Type Selection
Question: What would you like to do?
Options:
- Check database service status
  1. Collect Database Details
  2. Service Status
- Retrieve database resource information
  1. Collect Database Details
  2. Resource Information

#### Collect Database Details:
##### Platform Host Selection
Question: Please provide the database host endpoint along with port.
Validation: Check whether the host is designated to P2 (Dev).
Response:
- If valid: Proceed.
- If invalid: Return "Access Denied". Please contact {DB Ops Email ID}.

##### Database Type Selection
Question: Please provide the type of the database.
Options:
- MongoDB
- Oracle
- MySQL
- SQL Server
- PostgreSQL
- DB2

##### Database Selection
Question: Please provide the name of the database.
Validation: Check whether the user is associated with the database using SYSID.
Response:
- If valid: Proceed.
- If invalid: Return "Access Denied". Please contact {DB Ops Email ID}.

#### Service Status:
##### Status Inquiry
Question: What information do you need about the database service?
Options:
- Show current service status
- Notify recent service changes

Output:
- The database {database name} is currently [running / stopped].
- The service was last started / stopped on {timestamp}.

#### Resource Information:
##### Query Resource Details
Question: Show current resource usage?

Output:
- CPU: {% Usage}
- Memory: {% Usage}
- Storage: {% Usage}

Formula: {% Usage} => Usage / Allocation

Reference:
Database Port Number: Port Number - Database as a Service - Confluence

## Database Inference
### Overview
The Database Inference chatbot helps users determine the best database setup based on their requirements. It guides users through a series of questions to recommend a suitable database type and provides an estimated cost.

### Initial Setup
#### Domain Configuration
Define intents, entities, slots, responses, and actions to handle user interactions. This includes setting up the chatbot to recognize different types of user inputs and respond appropriately.

### Conversation Flow
#### Initial Message
Message: Welcome to the Database Setup Recommendation! Determine the best database setup based on your requirements.

#### Application Check
Question: What best describes your setup?
Options:
- Structured data, vendor app
- Structured data, home-grown app
- Unstructured data, vendor app
- Unstructured data, home-grown app

#### Special Features Check
Question: Do you need features like full-text search, embedding, or nested documents? And are you limited to Oracle?
Options:
- Yes, Oracle-only
- Yes, but flexible on database
- No special features needed

#### Relationship and Access Needs
Question: Do you need single-key access, complex relationships, or a relational schema for your data?
Options:
- Single-key access only
- Complex relationships or relational schema
- None of these

#### Quick Application Tolerance Check
Question: Can your app handle about an hour of downtime?
Options:
- Yes
- No

#### Database Choice and Cost Confirmation
Message: Based on your responses, we recommend [database type]. The estimated cost is [cost]. Shall we proceed with the request?
Options:
- Yes, proceed
- No, change choices

### Workflow Description
#### Workflow Initiation and Ticket Creation
- Action: Creates a Jira ticket with:
  - Initial Status: "Pending Approval"
  - Roles Assigned: Requester, Approver, and Implementer
  - Jira Notification: Approver receives a notification to review the request.

#### Approval Process
- Approval Decision by Approver:
  - Approve:
    - Status Update: Ticket moves to "Approved."
    - Notification: Implementer is notified to begin setup.
  - Reject:
    - Status Update: Ticket moves to "Rejected."
    - Notification: Requester is notified with a rejection message.

#### Implementation (if Approved)
- Implementer Action:
  - Acknowledge Ticket: Ticket status changes to "In Progress."
  - Database Setup: Implementer completes the setup and updates the ticket to "Completed."
  - Requester Notification: Jira notifies the Requester to verify the database.

#### Verification and Automatic Closure
- Requester Verification:
  - Close Ticket: If satisfied, Requester closes the ticket.
  - Automatic Closure: If no action is taken by the Requester after a specified time, Jira auto-closes the ticket.

### JIRA Ticket Message Format
- Requester: [Name of the requester]
- Database Type Requested: [Specify database type, e.g., MySQL, PostgreSQL]

Request Details:
- Data Structure: [Structured / Unstructured]
- Special Features Required: [e.g., Full-text search, relational schema, etc.]
- Downtime Tolerance: [High / Low]

Infrastructure Specifications:
- CPU: [e.g., 4 vCPUs]
- Memory: [e.g., 16 GB RAM]
- Storage: [e.g., 500 GB SSD]

Estimated Cost: [$ Amount] / Month

### Database Selection Matrix

| Data Type + App Type | Special Features | Relationship & Access Needs | Downtime Tolerance | Recommended Database & Setup |
|---------------------|------------------|----------------------------|-------------------|------------------------------|
| Structured + Vendor/Home-Grown | Oracle-only | Any | Any | Oracle |
| Structured + Vendor/Home-Grown | Flexible on DB | Single-key access only | Any | MySQL or PostgreSQL |
| Structured + Vendor/Home-Grown | Flexible on DB | Relational schema or complex relationships | Any | PostgreSQL or SQL Server (if Tier 1) |
| Unstructured + Vendor/Home-Grown | Flexible on DB | No special relationships or schema | Any | MongoDB |
| Unstructured + Vendor/Home-Grown | Flexible on DB | Complex relationships | Any | Neo4j |
| Any (Structured/Unstructured) | No special features | Any | High uptime only | Multi-AZ Deployment (PostgreSQL/SQL Server/MongoDB) |
| Any (Structured/Unstructured) | No special features | Any | Low uptime allowed | Single Instance with Snapshot |
