DB Recommendation Chatbot - Example Questions
==============================================

Use these questions to test the process_user_input() function or the POST /chat API endpoint.


1. Full Natural Language Input (recommended)
--------------------------------------------
- "I need a database for a new microservice. We have completed an Architecture Review, architect is arun reddy (EPIC-2024) for system SYSID-12345. The data is transactional and structured, the solution is CFG Developed, and we require ACID compliance. We prefer open-source tooling and do not have a Microsoft licensing agreement in place"
- "my name is John Smith, arch review yes, epic EPIC-2024-DB, sysid SYS-12345, transactional, structured, CFG developed, ACID yes, open source, no microsoft licensing"
- "architect: Jane Doe, architecture review no, sysid BM-999, transactional, structured, CFG developed, ACID yes, no open source, microsoft licensing yes"
- "my name is Alice Brown, sysid SYS-777, transactional, structured, CFG developed, no ACID, large database"


2. PostgreSQL Recommendations
------------------------------
- "transactional, structured, CFG developed, ACID yes, open source, no microsoft licensing"
- "transactional, structured, CFG developed, ACID yes, no open source, no microsoft"
- "transactional, structured, CFG developed, no ACID, large database"
- "I need a postgresql database"


3. MySQL Recommendation
------------------------
- "transactional, structured, CFG developed, no ACID, small database"
- "I need a mysql database"


4. MS SQL Server Recommendations
----------------------------------
- "transactional, structured, CFG developed, ACID yes, open source, microsoft licensing yes"
- "transactional, structured, CFG developed, ACID yes, no open source, microsoft licensing yes"
- "I need an MS SQL Server"


5. Feature Under Development
-----------------------------
- "analytics use case"
- "unstructured data"


6. Contact DBA Team
--------------------
- "vendor application"


7. Follow-up Responses
------------------------
- "yes"              → creates mocked Jira ticket (EDE-demo-1042)
- "no"               → declines ticket creation
- "start over"       → resets conversation


8. Clarification (insufficient info)
--------------------------------------
- "tell me about your services"
- "I need a database"


#example
Example  : { "message": "I need a database for a new microservice. We have completed an Architecture Review, architect is arun reddy (EPIC-2024) for system SYSID-12345. The data is transactional and structured, the solution is CFG Developed, and we require ACID compliance. We prefer open-source tooling and do not have a Microsoft licensing agreement in place" }
