// Sample Employee Database Data Loading for MongoDB
// This script loads sample data into the employee database

// Switch to employee_sample database
db = db.getSiblingDB('employee_sample');

print("Loading sample data into employee_sample database...");

// Load departments data
print("Loading departments...");
const departments = [
  {
    "_id": 1,
    "name": "Engineering",
    "description": "Software development and technical infrastructure",
    "manager_id": 3,
    "created_at": new Date("2024-01-01T00:00:00Z"),
    "updated_at": new Date("2024-01-01T00:00:00Z")
  },
  {
    "_id": 2,
    "name": "Marketing", 
    "description": "Product marketing and customer acquisition",
    "manager_id": 15,
    "created_at": new Date("2024-01-01T00:00:00Z"),
    "updated_at": new Date("2024-01-01T00:00:00Z")
  },
  {
    "_id": 3,
    "name": "Sales",
    "description": "Revenue generation and client relationships", 
    "manager_id": 20,
    "created_at": new Date("2024-01-01T00:00:00Z"),
    "updated_at": new Date("2024-01-01T00:00:00Z")
  },
  {
    "_id": 4,
    "name": "Human Resources",
    "description": "Employee management and organizational development",
    "manager_id": 26,
    "created_at": new Date("2024-01-01T00:00:00Z"),
    "updated_at": new Date("2024-01-01T00:00:00Z")
  },
  {
    "_id": 5,
    "name": "Finance",
    "description": "Financial planning and accounting",
    "manager_id": 29,
    "created_at": new Date("2024-01-01T00:00:00Z"),
    "updated_at": new Date("2024-01-01T00:00:00Z")
  },
  {
    "_id": 6,
    "name": "Operations",
    "description": "Business operations and process management",
    "manager_id": 33,
    "created_at": new Date("2024-01-01T00:00:00Z"),
    "updated_at": new Date("2024-01-01T00:00:00Z")
  },
  {
    "_id": 7,
    "name": "Customer Support",
    "description": "Customer service and technical support",
    "manager_id": 35,
    "created_at": new Date("2024-01-01T00:00:00Z"),
    "updated_at": new Date("2024-01-01T00:00:00Z")
  },
  {
    "_id": 8,
    "name": "Product Management",
    "description": "Product strategy and development coordination",
    "manager_id": 13,
    "created_at": new Date("2024-01-01T00:00:00Z"),
    "updated_at": new Date("2024-01-01T00:00:00Z")
  }
];

db.departments.insertMany(departments);
print("Inserted " + departments.length + " departments");

// Load positions data
print("Loading positions...");
const positions = [
  { "_id": 1, "title": "CEO", "description": "Chief Executive Officer", "salary_min": 200000, "salary_max": 500000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 2, "title": "CTO", "description": "Chief Technology Officer", "salary_min": 180000, "salary_max": 350000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 3, "title": "VP Engineering", "description": "Vice President of Engineering", "salary_min": 150000, "salary_max": 280000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 4, "title": "VP Marketing", "description": "Vice President of Marketing", "salary_min": 140000, "salary_max": 250000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 5, "title": "VP Sales", "description": "Vice President of Sales", "salary_min": 140000, "salary_max": 280000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 6, "title": "Engineering Manager", "description": "Manages engineering teams and projects", "salary_min": 120000, "salary_max": 180000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 7, "title": "Senior Software Engineer", "description": "Experienced software developer", "salary_min": 100000, "salary_max": 150000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 8, "title": "Software Engineer", "description": "Software developer", "salary_min": 80000, "salary_max": 120000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 9, "title": "Junior Software Engineer", "description": "Entry-level software developer", "salary_min": 60000, "salary_max": 90000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 10, "title": "DevOps Engineer", "description": "Infrastructure and deployment specialist", "salary_min": 90000, "salary_max": 140000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 11, "title": "QA Engineer", "description": "Quality assurance and testing", "salary_min": 70000, "salary_max": 110000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 12, "title": "Product Manager", "description": "Product strategy and roadmap", "salary_min": 100000, "salary_max": 160000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 13, "title": "Senior Product Manager", "description": "Senior product strategy and roadmap", "salary_min": 120000, "salary_max": 180000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 14, "title": "Marketing Manager", "description": "Marketing campaigns and strategy", "salary_min": 80000, "salary_max": 120000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 15, "title": "Sales Manager", "description": "Sales team management", "salary_min": 90000, "salary_max": 140000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 16, "title": "Sales Representative", "description": "Direct sales and client relations", "salary_min": 50000, "salary_max": 90000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 17, "title": "HR Manager", "description": "Human resources management", "salary_min": 80000, "salary_max": 120000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 18, "title": "HR Coordinator", "description": "Human resources coordination", "salary_min": 50000, "salary_max": 70000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 19, "title": "Finance Manager", "description": "Financial planning and analysis", "salary_min": 90000, "salary_max": 130000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 20, "title": "Accountant", "description": "Financial record keeping and reporting", "salary_min": 55000, "salary_max": 80000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 21, "title": "Operations Manager", "description": "Business operations oversight", "salary_min": 85000, "salary_max": 125000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 22, "title": "Customer Support Manager", "description": "Customer support team management", "salary_min": 70000, "salary_max": 100000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 23, "title": "Customer Support Specialist", "description": "Customer service and support", "salary_min": 40000, "salary_max": 60000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 24, "title": "Data Analyst", "description": "Data analysis and reporting", "salary_min": 70000, "salary_max": 100000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 25, "title": "UX Designer", "description": "User experience design", "salary_min": 75000, "salary_max": 115000, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 26, "title": "UI Designer", "description": "User interface design", "salary_min": 70000, "salary_max": 105000, "created_at": new Date(), "updated_at": new Date() }
];

db.positions.insertMany(positions);
print("Inserted " + positions.length + " positions");

// Load employees data with embedded references
print("Loading employees...");
const employees = [
  {
    "_id": 1, "employee_number": "EMP001", "first_name": "Sarah", "last_name": "Johnson", "email": "sarah.johnson@company.com", "phone": "555-0101", 
    "hire_date": new Date("2020-01-15"), "salary": 250000, "is_active": true,
    "position": {"id": 1, "title": "CEO"}, 
    "department": {"id": 1, "name": "Engineering"}, 
    "manager": null,
    "created_at": new Date(), "updated_at": new Date()
  },
  {
    "_id": 2, "employee_number": "EMP002", "first_name": "Michael", "last_name": "Chen", "email": "michael.chen@company.com", "phone": "555-0102", 
    "hire_date": new Date("2020-02-01"), "salary": 220000, "is_active": true,
    "position": {"id": 2, "title": "CTO"}, 
    "department": {"id": 1, "name": "Engineering"}, 
    "manager": {"id": 1, "name": "Sarah Johnson"},
    "created_at": new Date(), "updated_at": new Date()
  },
  {
    "_id": 3, "employee_number": "EMP003", "first_name": "David", "last_name": "Rodriguez", "email": "david.rodriguez@company.com", "phone": "555-0103", 
    "hire_date": new Date("2020-03-01"), "salary": 160000, "is_active": true,
    "position": {"id": 3, "title": "VP Engineering"}, 
    "department": {"id": 1, "name": "Engineering"}, 
    "manager": {"id": 1, "name": "Sarah Johnson"},
    "created_at": new Date(), "updated_at": new Date()
  },
  {
    "_id": 4, "employee_number": "EMP004", "first_name": "Emily", "last_name": "Davis", "email": "emily.davis@company.com", "phone": "555-0104", 
    "hire_date": new Date("2021-01-15"), "salary": 140000, "is_active": true,
    "position": {"id": 6, "title": "Engineering Manager"}, 
    "department": {"id": 1, "name": "Engineering"}, 
    "manager": {"id": 2, "name": "Michael Chen"},
    "created_at": new Date(), "updated_at": new Date()
  },
  {
    "_id": 5, "employee_number": "EMP005", "first_name": "James", "last_name": "Wilson", "email": "james.wilson@company.com", "phone": "555-0105", 
    "hire_date": new Date("2021-02-01"), "salary": 130000, "is_active": true,
    "position": {"id": 7, "title": "Senior Software Engineer"}, 
    "department": {"id": 1, "name": "Engineering"}, 
    "manager": {"id": 4, "name": "Emily Davis"},
    "created_at": new Date(), "updated_at": new Date()
  },
  {
    "_id": 15, "employee_number": "EMP015", "first_name": "Steven", "last_name": "Harris", "email": "steven.harris@company.com", "phone": "555-0115", 
    "hire_date": new Date("2020-04-01"), "salary": 180000, "is_active": true,
    "position": {"id": 4, "title": "VP Marketing"}, 
    "department": {"id": 2, "name": "Marketing"}, 
    "manager": {"id": 1, "name": "Sarah Johnson"},
    "created_at": new Date(), "updated_at": new Date()
  },
  {
    "_id": 20, "employee_number": "EMP020", "first_name": "Patricia", "last_name": "Allen", "email": "patricia.allen@company.com", "phone": "555-0120", 
    "hire_date": new Date("2020-06-01"), "salary": 200000, "is_active": true,
    "position": {"id": 5, "title": "VP Sales"}, 
    "department": {"id": 3, "name": "Sales"}, 
    "manager": {"id": 1, "name": "Sarah Johnson"},
    "created_at": new Date(), "updated_at": new Date()
  },
  {
    "_id": 26, "employee_number": "EMP026", "first_name": "Linda", "last_name": "Green", "email": "linda.green@company.com", "phone": "555-0126", 
    "hire_date": new Date("2020-07-01"), "salary": 100000, "is_active": true,
    "position": {"id": 17, "title": "HR Manager"}, 
    "department": {"id": 4, "name": "Human Resources"}, 
    "manager": {"id": 1, "name": "Sarah Johnson"},
    "created_at": new Date(), "updated_at": new Date()
  }
];

// Add more employees (abbreviated for space)
const moreEmployees = [
  { "_id": 6, "employee_number": "EMP006", "first_name": "Lisa", "last_name": "Anderson", "email": "lisa.anderson@company.com", "phone": "555-0106", "hire_date": new Date("2021-03-15"), "salary": 110000, "is_active": true, "position": {"id": 8, "title": "Software Engineer"}, "department": {"id": 1, "name": "Engineering"}, "manager": {"id": 4, "name": "Emily Davis"}, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 7, "employee_number": "EMP007", "first_name": "Robert", "last_name": "Taylor", "email": "robert.taylor@company.com", "phone": "555-0107", "hire_date": new Date("2022-01-10"), "salary": 95000, "is_active": true, "position": {"id": 8, "title": "Software Engineer"}, "department": {"id": 1, "name": "Engineering"}, "manager": {"id": 4, "name": "Emily Davis"}, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 8, "employee_number": "EMP008", "first_name": "Jennifer", "last_name": "Brown", "email": "jennifer.brown@company.com", "phone": "555-0108", "hire_date": new Date("2022-06-01"), "salary": 85000, "is_active": true, "position": {"id": 9, "title": "Junior Software Engineer"}, "department": {"id": 1, "name": "Engineering"}, "manager": {"id": 4, "name": "Emily Davis"}, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 13, "employee_number": "EMP013", "first_name": "Kevin", "last_name": "Jackson", "email": "kevin.jackson@company.com", "phone": "555-0113", "hire_date": new Date("2020-05-01"), "salary": 140000, "is_active": true, "position": {"id": 13, "title": "Senior Product Manager"}, "department": {"id": 8, "name": "Product Management"}, "manager": {"id": 2, "name": "Michael Chen"}, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 16, "employee_number": "EMP016", "first_name": "Nicole", "last_name": "Clark", "email": "nicole.clark@company.com", "phone": "555-0116", "hire_date": new Date("2021-05-15"), "salary": 95000, "is_active": true, "position": {"id": 14, "title": "Marketing Manager"}, "department": {"id": 2, "name": "Marketing"}, "manager": {"id": 15, "name": "Steven Harris"}, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 21, "employee_number": "EMP021", "first_name": "Thomas", "last_name": "Young", "email": "thomas.young@company.com", "phone": "555-0121", "hire_date": new Date("2021-01-01"), "salary": 110000, "is_active": true, "position": {"id": 15, "title": "Sales Manager"}, "department": {"id": 3, "name": "Sales"}, "manager": {"id": 20, "name": "Patricia Allen"}, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 29, "employee_number": "EMP029", "first_name": "Paul", "last_name": "Gonzalez", "email": "paul.gonzalez@company.com", "phone": "555-0129", "hire_date": new Date("2020-08-01"), "salary": 110000, "is_active": true, "position": {"id": 19, "title": "Finance Manager"}, "department": {"id": 5, "name": "Finance"}, "manager": {"id": 1, "name": "Sarah Johnson"}, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 33, "employee_number": "EMP033", "first_name": "Edward", "last_name": "Perez", "email": "edward.perez@company.com", "phone": "555-0133", "hire_date": new Date("2020-09-01"), "salary": 105000, "is_active": true, "position": {"id": 21, "title": "Operations Manager"}, "department": {"id": 6, "name": "Operations"}, "manager": {"id": 1, "name": "Sarah Johnson"}, "created_at": new Date(), "updated_at": new Date() },
  { "_id": 35, "employee_number": "EMP035", "first_name": "Jason", "last_name": "Turner", "email": "jason.turner@company.com", "phone": "555-0135", "hire_date": new Date("2020-10-01"), "salary": 85000, "is_active": true, "position": {"id": 22, "title": "Customer Support Manager"}, "department": {"id": 7, "name": "Customer Support"}, "manager": {"id": 1, "name": "Sarah Johnson"}, "created_at": new Date(), "updated_at": new Date() }
];

const allEmployees = employees.concat(moreEmployees);
db.employees.insertMany(allEmployees);
print("Inserted " + allEmployees.length + " employees");

// Load projects data
print("Loading projects...");
const projects = [
  {
    "_id": 1,
    "name": "Website Redesign",
    "description": "Complete overhaul of company website",
    "start_date": new Date("2024-01-15"),
    "end_date": new Date("2024-06-30"),
    "status": "active",
    "team_members": [
      {"employee_id": 5, "employee_name": "James Wilson", "role": "Tech Lead", "start_date": new Date("2024-01-15"), "end_date": null},
      {"employee_id": 6, "employee_name": "Lisa Anderson", "role": "Frontend Developer", "start_date": new Date("2024-01-15"), "end_date": null},
      {"employee_id": 7, "employee_name": "Robert Taylor", "role": "Backend Developer", "start_date": new Date("2024-01-15"), "end_date": null}
    ],
    "created_at": new Date()
  },
  {
    "_id": 2,
    "name": "Mobile App Development",
    "description": "Native mobile application for iOS and Android",
    "start_date": new Date("2024-02-01"),
    "end_date": new Date("2024-08-31"),
    "status": "active",
    "team_members": [
      {"employee_id": 4, "employee_name": "Emily Davis", "role": "Project Manager", "start_date": new Date("2024-02-01"), "end_date": null},
      {"employee_id": 8, "employee_name": "Jennifer Brown", "role": "Mobile Developer", "start_date": new Date("2024-02-01"), "end_date": null}
    ],
    "created_at": new Date()
  },
  {
    "_id": 3,
    "name": "Customer Portal",
    "description": "Self-service portal for customer management",
    "start_date": new Date("2024-01-01"),
    "end_date": new Date("2024-05-31"),
    "status": "completed",
    "team_members": [
      {"employee_id": 5, "employee_name": "James Wilson", "role": "Tech Lead", "start_date": new Date("2024-01-01"), "end_date": new Date("2024-05-31")},
      {"employee_id": 13, "employee_name": "Kevin Jackson", "role": "Product Manager", "start_date": new Date("2024-01-01"), "end_date": new Date("2024-05-31")}
    ],
    "created_at": new Date()
  }
];

db.projects.insertMany(projects);
print("Inserted " + projects.length + " projects");

print("Sample data loading completed successfully!");
print("Database summary:");
print("- Departments: " + db.departments.countDocuments());
print("- Positions: " + db.positions.countDocuments());
print("- Employees: " + db.employees.countDocuments());
print("- Projects: " + db.projects.countDocuments());