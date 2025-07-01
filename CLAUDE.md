# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thanos is a Database Observability Chatbot system with a microservices architecture consisting of:
- **Frontend**: React 19 + TypeScript + Vite (eddi-chatbot-web)
- **API Gateway**: FastAPI backend (eddi-chatbot-api) 
- **NLU Service**: Rasa conversational AI (eddi-chatbot-nlu)
- **Storage**: PostgreSQL + Redis

## Development Commands

### Service Management
```bash
# Start all services
docker-compose up

# Start with rebuild
docker-compose up --build

# Start infrastructure only
docker-compose up redis postgres -d

# Start sample databases for testing
docker-compose up sample-employee-postgres sample-employee-mysql sample-employee-mongo -d
```

### Frontend Development (eddi-chatbot-web)
```bash
cd eddi-chatbot-web
pnpm dev          # Development server
pnpm build        # Production build
pnpm test         # Run tests with coverage
pnpm lint         # ESLint code quality checks
```

### Backend API Development (eddi-chatbot-api)
```bash
cd eddi-chatbot-api
uv sync           # Install dependencies
uv run uvicorn main:app --reload  # Development server
uv run pytest    # Run tests (if configured)
```

### NLU Service Development (eddi-chatbot-nlu)
```bash
cd eddi-chatbot-nlu
uv sync           # Install dependencies
./scripts/start-server.sh  # Start Rasa server (auto-trains if needed)
rasa train        # Train model manually
rasa test nlu     # Test NLU model
rasa interactive  # Interactive training
```

## Architecture Overview

### Service Communication
- Services communicate via custom Docker network `thanos-network`
- API Gateway (port 48000) routes requests to NLU service (port 45005)
- Frontend (port 43000) connects to API Gateway
- Redis (port 46379) for session state and caching
- PostgreSQL (port 45432) for persistent storage

### Key Components
- **OAuth Integration**: Okta authentication with PKCE flow
- **Database Management**: PostgreSQL/MySQL/MongoDB schema exploration and management
- **Conversational AI**: 28+ intents with slot filling and button-based interactions
- **Query Analysis**: SQL performance analysis with execution plans
- **Form-based Recommendations**: Database type recommendations based on requirements

### Database Operations
The chatbot supports:
- Database provisioning (PostgreSQL creation)
- Database decommissioning (secure deletion)
- Schema exploration with downloadable reports
- Query performance analysis
- Patch information retrieval

### Sample Databases for Testing
Three pre-configured sample databases are available for testing schema exploration and query analysis:

#### PostgreSQL Sample Database
- **Port**: 45433
- **Database**: employee_sample
- **User**: employee_user
- **Password**: employee_pass
- **External Connection**: `postgresql://employee_user:employee_pass@localhost:45433/employee_sample`
- **Docker Internal**: `postgresql://employee_user:employee_pass@sample-employee-postgres:5432/employee_sample`

#### MySQL Sample Database
- **Port**: 45434
- **Database**: employee_sample
- **User**: employee_user
- **Password**: employee_pass
- **External Connection**: `mysql://employee_user:employee_pass@localhost:45434/employee_sample`
- **Docker Internal**: `mysql://employee_user:employee_pass@sample-employee-mysql:3306/employee_sample`

#### MongoDB Sample Database
- **Port**: 45435
- **Database**: employee_sample
- **Admin User**: mongo_admin
- **Admin Password**: mongo_pass
- **External Connection**: `mongodb://mongo_admin:mongo_pass@localhost:45435/employee_sample?authSource=admin`
- **Docker Internal**: `mongodb://mongo_admin:mongo_pass@sample-employee-mongo:27017/employee_sample?authSource=admin`

#### Sample Database Schema
All databases contain realistic employee management data:
- **8 Departments**: Engineering, Marketing, Sales, HR, Finance, Operations, Customer Support, Product Management
- **26 Position Types**: From CEO/CTO to Junior Engineers, with salary ranges
- **40 Employees**: Realistic employee data with hierarchical manager relationships
- **8 Projects**: Active and completed projects with team assignments
- **Rich Relationships**: Department managers, employee hierarchies, project assignments

#### Testing Schema Exploration
1. Start the sample databases: `docker-compose up sample-employee-postgres sample-employee-mysql sample-employee-mongo -d`
2. Access the chatbot at http://localhost:43000
3. Use the schema exploration feature with the appropriate connection strings:
   - **External connections** (from host machine): Use the `localhost` connection strings
   - **Internal connections** (from chatbot containers): Use the `Docker Internal` connection strings
4. Test object types: tables, views, functions, procedures, indexes, constraints, triggers
5. Download schema definitions and verify comprehensive documentation

#### Connection String Usage
- **Frontend testing**: Use external connection strings (localhost with ports)
- **Chatbot backend**: Automatically uses internal connection strings (container names with default ports)
- **Direct database access**: Use external connection strings for tools like pgAdmin, MySQL Workbench, MongoDB Compass

## Tech Stack

### Backend
- Python 3.9+ with `uv` package manager
- FastAPI for API layer
- Rasa 3.6+ for conversational AI
- SQLAlchemy for database ORM
- Redis for caching and session management

### Frontend  
- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS + Radix UI components
- Vitest for testing
- Jotai for state management

### Development Tools
- Docker Compose for service orchestration
- ESLint for code quality
- Comprehensive test coverage with Vitest and pytest

## Testing
- Frontend: `pnpm test` (Vitest with jsdom, comprehensive coverage)
- Backend: `uv run pytest` (if configured)
- NLU: `rasa test nlu` and `rasa test core`

### Sample Database Testing
```bash
# Test PostgreSQL connectivity and data
docker exec sample-employee-postgres psql -U employee_user -d employee_sample -c "SELECT COUNT(*) FROM employees;"

# Test MySQL connectivity and data
docker exec sample-employee-mysql mysql -u employee_user -pemployee_pass -e "USE employee_sample; SELECT COUNT(*) FROM employees;"

# Test MongoDB connectivity and data
docker exec sample-employee-mongo mongosh "mongodb://mongo_admin:mongo_pass@localhost:27017/employee_sample?authSource=admin" --eval "db.employees.countDocuments()"

# View department breakdown
docker exec sample-employee-postgres psql -U employee_user -d employee_sample -c "SELECT d.name, COUNT(e.id) as employee_count FROM departments d LEFT JOIN employees e ON d.id = e.department_id GROUP BY d.id, d.name ORDER BY d.name;"
```

## Enterprise Configuration
- Uses `hoover.yml` for Citizens Bank internal deployment
- OpenShift deployment configuration (currently ci-only mode)
- Fortify security scanning integration
- ServiceNow change management integration