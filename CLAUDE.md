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

## Query Analyzer Sample Queries

The following sample queries can be used to test the query analyzer feature across all three database types. These queries demonstrate various performance scenarios including simple selects, joins, aggregations, and complex operations.

### PostgreSQL Sample Queries

#### Basic Queries
```sql
-- Simple employee lookup
SELECT first_name, last_name, email FROM employees WHERE department_id = 1;

-- Count employees by department
SELECT COUNT(*) as employee_count FROM employees;

-- Employee with salary information
SELECT e.first_name, e.last_name, p.title, p.salary_min, p.salary_max 
FROM employees e 
JOIN positions p ON e.position_id = p.id 
WHERE e.id = 1;
```

#### Complex Joins and Aggregations
```sql
-- Department statistics with manager info
SELECT 
    d.name as department,
    COUNT(e.id) as employee_count,
    AVG(p.salary_min) as avg_min_salary,
    m.first_name || ' ' || m.last_name as manager_name
FROM departments d
LEFT JOIN employees e ON d.id = e.department_id
LEFT JOIN positions p ON e.position_id = p.id
LEFT JOIN employees m ON d.manager_id = m.id
GROUP BY d.id, d.name, m.first_name, m.last_name
ORDER BY employee_count DESC;

-- Project assignments with employee details
SELECT 
    pr.name as project_name,
    pr.status,
    e.first_name || ' ' || e.last_name as employee_name,
    p.title as position,
    d.name as department
FROM projects pr
JOIN project_employees pe ON pr.id = pe.project_id
JOIN employees e ON pe.employee_id = e.id
JOIN positions p ON e.position_id = p.id
JOIN departments d ON e.department_id = d.id
WHERE pr.status = 'Active'
ORDER BY pr.name, e.last_name;
```

#### Performance Testing Queries
```sql
-- Expensive query without proper indexing
SELECT e1.first_name, e1.last_name, e2.first_name as manager_first, e2.last_name as manager_last
FROM employees e1, employees e2, departments d
WHERE e1.department_id = d.id AND d.manager_id = e2.id
ORDER BY e1.last_name;

-- Optimized version with proper joins
SELECT e.first_name, e.last_name, m.first_name as manager_first, m.last_name as manager_last
FROM employees e
JOIN departments d ON e.department_id = d.id
JOIN employees m ON d.manager_id = m.id
ORDER BY e.last_name;
```

### MySQL Sample Queries

#### Basic Queries
```sql
-- Employee hierarchy lookup
SELECT first_name, last_name, email FROM employees WHERE manager_id IS NOT NULL LIMIT 10;

-- Department employee count
SELECT COUNT(*) as total_employees FROM employees;

-- Salary range analysis
SELECT e.first_name, e.last_name, p.title, p.salary_min, p.salary_max
FROM employees e
INNER JOIN positions p ON e.position_id = p.id
WHERE p.salary_max > 100000;
```

#### Advanced Queries
```sql
-- Top earning positions by department
SELECT 
    d.name as department,
    p.title as position,
    p.salary_max as max_salary,
    COUNT(e.id) as employee_count
FROM departments d
JOIN employees e ON d.id = e.department_id
JOIN positions p ON e.position_id = p.id
GROUP BY d.name, p.title, p.salary_max
HAVING COUNT(e.id) > 0
ORDER BY p.salary_max DESC
LIMIT 20;

-- Project workload analysis
SELECT 
    e.first_name,
    e.last_name,
    COUNT(pe.project_id) as active_projects,
    d.name as department
FROM employees e
LEFT JOIN project_employees pe ON e.id = pe.employee_id
LEFT JOIN projects pr ON pe.project_id = pr.id AND pr.status = 'Active'
JOIN departments d ON e.department_id = d.id
GROUP BY e.id, e.first_name, e.last_name, d.name
ORDER BY active_projects DESC;
```

#### MySQL-Specific Performance Queries
```sql
-- Query with subquery (may be slow)
SELECT * FROM employees WHERE department_id IN (
    SELECT id FROM departments WHERE name LIKE '%Engineering%'
);

-- Optimized with JOIN
SELECT e.* FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE d.name LIKE '%Engineering%';
```

### MongoDB Sample Queries

#### Basic Queries
```javascript
// Find employees in specific department
db.employees.find({"department_id": 1});

// Count total employees
db.employees.countDocuments();

// Find employees with salary info
db.employees.aggregate([
    {
        $lookup: {
            from: "positions",
            localField: "position_id",
            foreignField: "id",
            as: "position"
        }
    },
    { $unwind: "$position" },
    {
        $project: {
            first_name: 1,
            last_name: 1,
            email: 1,
            "position.title": 1,
            "position.salary_min": 1,
            "position.salary_max": 1
        }
    }
]).limit(10);
```

#### Complex Aggregations
```javascript
// Department statistics with employee count
db.employees.aggregate([
    {
        $lookup: {
            from: "departments",
            localField: "department_id",
            foreignField: "id",
            as: "dept"
        }
    },
    { $unwind: "$dept" },
    {
        $lookup: {
            from: "positions",
            localField: "position_id",
            foreignField: "id",
            as: "position"
        }
    },
    { $unwind: "$position" },
    {
        $group: {
            _id: "$dept.name",
            employee_count: { $sum: 1 },
            avg_min_salary: { $avg: "$position.salary_min" },
            avg_max_salary: { $avg: "$position.salary_max" }
        }
    },
    { $sort: { employee_count: -1 } }
]);

// Project assignments analysis
db.project_employees.aggregate([
    {
        $lookup: {
            from: "projects",
            localField: "project_id",
            foreignField: "id",
            as: "project"
        }
    },
    { $unwind: "$project" },
    {
        $lookup: {
            from: "employees",
            localField: "employee_id",
            foreignField: "id",
            as: "employee"
        }
    },
    { $unwind: "$employee" },
    {
        $lookup: {
            from: "departments",
            localField: "employee.department_id",
            foreignField: "id",
            as: "department"
        }
    },
    { $unwind: "$department" },
    {
        $match: { "project.status": "Active" }
    },
    {
        $project: {
            project_name: "$project.name",
            employee_name: { $concat: ["$employee.first_name", " ", "$employee.last_name"] },
            department: "$department.name"
        }
    },
    { $sort: { project_name: 1, employee_name: 1 } }
]);
```

#### MongoDB Performance Testing
```javascript
// Inefficient query without proper indexing
db.employees.find().sort({last_name: 1, first_name: 1});

// Query that could benefit from compound index
db.employees.find({
    "department_id": 1,
    "hire_date": { $gte: new Date("2020-01-01") }
}).sort({hire_date: -1});

// Complex aggregation that tests pipeline performance
db.employees.aggregate([
    {
        $lookup: {
            from: "departments",
            localField: "department_id", 
            foreignField: "id",
            as: "dept"
        }
    },
    { $unwind: "$dept" },
    {
        $lookup: {
            from: "project_employees",
            localField: "id",
            foreignField: "employee_id",
            as: "projects"
        }
    },
    {
        $addFields: {
            project_count: { $size: "$projects" }
        }
    },
    {
        $group: {
            _id: "$dept.name",
            total_employees: { $sum: 1 },
            avg_projects_per_employee: { $avg: "$project_count" },
            employees_with_projects: {
                $sum: { $cond: [{ $gt: ["$project_count", 0] }, 1, 0] }
            }
        }
    },
    { $sort: { total_employees: -1 } }
]);
```

### Query Performance Testing Notes

#### Connection Strings for Testing
- **PostgreSQL**: `postgresql://employee_user:employee_pass@localhost:45433/employee_sample`
- **MySQL**: `mysql://employee_user:employee_pass@localhost:45434/employee_sample`  
- **MongoDB**: `mongodb://mongo_admin:mongo_pass@localhost:45435/employee_sample?authSource=admin`

#### Performance Testing Guidelines
1. **Simple Queries**: Test basic CRUD operations and simple filters
2. **Join Performance**: Test various join types and complexity levels
3. **Aggregation Load**: Test GROUP BY, COUNT, SUM, AVG operations
4. **Index Optimization**: Compare queries with and without proper indexing
5. **Large Result Sets**: Test queries that return significant data volumes
6. **Complex Conditions**: Test nested WHERE clauses and subqueries

#### Expected Performance Characteristics
- **Fast Queries** (< 10ms): Simple selects with indexed columns
- **Medium Queries** (10-100ms): Simple joins and basic aggregations
- **Slow Queries** (> 100ms): Complex joins, large aggregations, missing indexes

These queries provide comprehensive coverage for testing query analyzer functionality across all supported database types.

## Enterprise Configuration
- Uses `hoover.yml` for Citizens Bank internal deployment
- OpenShift deployment configuration (currently ci-only mode)
- Fortify security scanning integration
- ServiceNow change management integration