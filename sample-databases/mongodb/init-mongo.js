// Sample Employee Database Initialization for MongoDB
// This script creates the initial collections and indexes for employee management

// Switch to employee_sample database
db = db.getSiblingDB('employee_sample');

// Create departments collection with validation
db.createCollection("departments", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["name"],
         properties: {
            name: {
               bsonType: "string",
               description: "Department name is required and must be a string"
            },
            description: {
               bsonType: "string",
               description: "Department description must be a string"
            },
            manager_id: {
               bsonType: ["int", "null"],
               description: "Manager ID must be an integer or null"
            },
            created_at: {
               bsonType: "date",
               description: "Created date must be a date"
            },
            updated_at: {
               bsonType: "date", 
               description: "Updated date must be a date"
            }
         }
      }
   }
});

// Create positions collection with validation
db.createCollection("positions", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["title"],
         properties: {
            title: {
               bsonType: "string",
               description: "Position title is required and must be a string"
            },
            description: {
               bsonType: "string",
               description: "Position description must be a string"
            },
            salary_min: {
               bsonType: ["double", "int", "null"],
               description: "Minimum salary must be a number or null"
            },
            salary_max: {
               bsonType: ["double", "int", "null"], 
               description: "Maximum salary must be a number or null"
            },
            created_at: {
               bsonType: "date",
               description: "Created date must be a date"
            },
            updated_at: {
               bsonType: "date",
               description: "Updated date must be a date"
            }
         }
      }
   }
});

// Create employees collection with validation
db.createCollection("employees", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["employee_number", "first_name", "last_name", "email", "hire_date"],
         properties: {
            employee_number: {
               bsonType: "string",
               description: "Employee number is required and must be a string"
            },
            first_name: {
               bsonType: "string",
               description: "First name is required and must be a string"
            },
            last_name: {
               bsonType: "string", 
               description: "Last name is required and must be a string"
            },
            email: {
               bsonType: "string",
               pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
               description: "Email is required and must be a valid email format"
            },
            phone: {
               bsonType: ["string", "null"],
               description: "Phone must be a string or null"
            },
            hire_date: {
               bsonType: "date",
               description: "Hire date is required and must be a date"
            },
            salary: {
               bsonType: ["double", "int", "null"],
               description: "Salary must be a number or null"
            },
            position: {
               bsonType: ["object", "null"],
               description: "Position reference object"
            },
            department: {
               bsonType: ["object", "null"],
               description: "Department reference object"
            },
            manager: {
               bsonType: ["object", "null"], 
               description: "Manager reference object"
            },
            is_active: {
               bsonType: "bool",
               description: "Active status must be a boolean"
            },
            created_at: {
               bsonType: "date",
               description: "Created date must be a date"
            },
            updated_at: {
               bsonType: "date",
               description: "Updated date must be a date"
            }
         }
      }
   }
});

// Create projects collection
db.createCollection("projects", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["name"],
         properties: {
            name: {
               bsonType: "string",
               description: "Project name is required and must be a string"
            },
            description: {
               bsonType: "string",
               description: "Project description must be a string"
            },
            start_date: {
               bsonType: ["date", "null"],
               description: "Start date must be a date or null"
            },
            end_date: {
               bsonType: ["date", "null"],
               description: "End date must be a date or null"
            },
            status: {
               bsonType: "string",
               enum: ["active", "completed", "on_hold", "cancelled"],
               description: "Status must be one of: active, completed, on_hold, cancelled"
            },
            team_members: {
               bsonType: "array",
               items: {
                  bsonType: "object",
                  properties: {
                     employee_id: {
                        bsonType: "int",
                        description: "Employee ID must be an integer"
                     },
                     employee_name: {
                        bsonType: "string",
                        description: "Employee name must be a string"
                     },
                     role: {
                        bsonType: "string",
                        description: "Role must be a string"
                     },
                     start_date: {
                        bsonType: ["date", "null"],
                        description: "Start date must be a date or null"
                     },
                     end_date: {
                        bsonType: ["date", "null"],
                        description: "End date must be a date or null"
                     }
                  }
               }
            },
            created_at: {
               bsonType: "date",
               description: "Created date must be a date"
            }
         }
      }
   }
});

// Create indexes
print("Creating indexes...");

// Departments indexes
db.departments.createIndex({ "name": 1 }, { unique: true });
db.departments.createIndex({ "manager_id": 1 });

// Positions indexes  
db.positions.createIndex({ "title": 1 });
db.positions.createIndex({ "salary_min": 1, "salary_max": 1 });

// Employees indexes
db.employees.createIndex({ "employee_number": 1 }, { unique: true });
db.employees.createIndex({ "email": 1 }, { unique: true });
db.employees.createIndex({ "department.id": 1 });
db.employees.createIndex({ "position.id": 1 });
db.employees.createIndex({ "manager.id": 1 });
db.employees.createIndex({ "hire_date": 1 });
db.employees.createIndex({ "last_name": 1, "first_name": 1 });
db.employees.createIndex({ "is_active": 1 });

// Projects indexes
db.projects.createIndex({ "name": 1 });
db.projects.createIndex({ "status": 1 });
db.projects.createIndex({ "start_date": 1, "end_date": 1 });
db.projects.createIndex({ "team_members.employee_id": 1 });

// Create compound indexes for common queries
db.employees.createIndex({ "department.id": 1, "is_active": 1 });
db.employees.createIndex({ "position.id": 1, "salary": 1 });

print("Database initialization completed successfully!");
print("Collections created: " + db.getCollectionNames().length);
print("Available collections: " + db.getCollectionNames().join(", "));