# Sample Employee Databases

This directory contains three sample employee databases designed for testing schema exploration and query analysis functionality in the Thanos Database Observability Chatbot.

## Available Databases

### 1. PostgreSQL Sample Database
- **Container**: `sample-employee-postgres`
- **Port**: `45433`
- **Database**: `employee_sample`
- **User**: `employee_user`
- **Password**: `employee_pass`
- **Connection String**: `postgresql://employee_user:employee_pass@localhost:45433/employee_sample`

### 2. MySQL Sample Database
- **Container**: `sample-employee-mysql`
- **Port**: `45434`
- **Database**: `employee_sample`
- **User**: `employee_user`
- **Password**: `employee_pass`
- **Connection String**: `mysql://employee_user:employee_pass@localhost:45434/employee_sample`

### 3. MongoDB Sample Database
- **Container**: `sample-employee-mongo`
- **Port**: `45435`
- **Database**: `employee_sample`
- **Admin User**: `mongo_admin`
- **Admin Password**: `mongo_pass`
- **Connection String**: `mongodb://mongo_admin:mongo_pass@localhost:45435/employee_sample?authSource=admin`

## Database Schema

All three databases contain equivalent employee management schemas with the following entities:

### Core Tables/Collections:
- **departments**: Company departments (Engineering, Marketing, Sales, HR, Finance, Operations, Customer Support, Product Management)
- **positions**: Job titles with salary ranges (CEO, CTO, VPs, Managers, Engineers, etc.)
- **employees**: Employee records with personal info, position, department, and manager relationships
- **projects**: Active and completed projects
- **employee_projects**: Many-to-many relationship between employees and projects (PostgreSQL/MySQL only)

### Sample Data Statistics:
- **PostgreSQL**: 40 employees across 8 departments
- **MySQL**: 40 employees across 8 departments  
- **MongoDB**: 17 employees across 8 departments (abbreviated dataset)

## Usage

### Starting the Databases
```bash
# Start all sample databases
docker-compose up sample-employee-postgres sample-employee-mysql sample-employee-mongo -d

# Start specific database
docker-compose up sample-employee-postgres -d
```

### Testing Connectivity

#### PostgreSQL
```bash
docker exec sample-employee-postgres psql -U employee_user -d employee_sample -c "SELECT COUNT(*) FROM employees;"
```

#### MySQL
```bash
docker exec sample-employee-mysql mysql -u employee_user -pemployee_pass -e "USE employee_sample; SELECT COUNT(*) FROM employees;"
```

#### MongoDB
```bash
docker exec sample-employee-mongo mongosh "mongodb://mongo_admin:mongo_pass@localhost:27017/employee_sample?authSource=admin" --eval "db.employees.countDocuments()"
```

### Schema Exploration Testing

Use these connection strings with the chatbot's schema exploration feature:

1. **PostgreSQL**: "I want to explore a PostgreSQL database"
   - Connection string: `postgresql://employee_user:employee_pass@localhost:45433/employee_sample`

2. **MySQL**: "I want to explore a MySQL database"
   - Connection string: `mysql://employee_user:employee_pass@localhost:45434/employee_sample`

3. **MongoDB**: "I want to explore a MongoDB database"
   - Connection string: `mongodb://mongo_admin:mongo_pass@localhost:45435/employee_sample?authSource=admin`

## File Structure

```
sample-databases/
├── postgres/
│   ├── 01-init-schema.sql      # PostgreSQL schema creation
│   └── 02-sample-data.sql      # PostgreSQL sample data
├── mysql/
│   ├── 01-init-schema.sql      # MySQL schema creation
│   └── 02-sample-data.sql      # MySQL sample data
├── mongodb/
│   ├── init-mongo.js           # MongoDB schema and indexes
│   ├── load-data.js            # MongoDB sample data
│   ├── departments.json        # Department data (not used)
│   └── positions.json          # Position data (not used)
└── README.md                   # This file
```

## Integration with Chatbot

These databases are specifically designed to work with the existing chatbot schema exploration functionality:

- **db_utils.py**: Database connection utilities
- **schema_explorer.py**: Multi-database schema exploration actions
- **query_analyzer.py**: SQL/NoSQL query analysis capabilities

The databases provide realistic test data for:
- Schema discovery and documentation
- Query performance analysis
- Database comparison across different technologies
- Employee data management scenarios