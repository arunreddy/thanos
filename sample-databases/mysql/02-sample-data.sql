-- Sample Employee Database Data for MySQL
-- This script populates the employee database with realistic sample data

USE employee_sample;

-- Insert departments
INSERT INTO departments (name, description) VALUES
('Engineering', 'Software development and technical infrastructure'),
('Marketing', 'Product marketing and customer acquisition'),
('Sales', 'Revenue generation and client relationships'),
('Human Resources', 'Employee management and organizational development'),
('Finance', 'Financial planning and accounting'),
('Operations', 'Business operations and process management'),
('Customer Support', 'Customer service and technical support'),
('Product Management', 'Product strategy and development coordination');

-- Insert positions
INSERT INTO positions (title, description, salary_min, salary_max) VALUES
('CEO', 'Chief Executive Officer', 200000, 500000),
('CTO', 'Chief Technology Officer', 180000, 350000),
('VP Engineering', 'Vice President of Engineering', 150000, 280000),
('VP Marketing', 'Vice President of Marketing', 140000, 250000),
('VP Sales', 'Vice President of Sales', 140000, 280000),
('Engineering Manager', 'Manages engineering teams and projects', 120000, 180000),
('Senior Software Engineer', 'Experienced software developer', 100000, 150000),
('Software Engineer', 'Software developer', 80000, 120000),
('Junior Software Engineer', 'Entry-level software developer', 60000, 90000),
('DevOps Engineer', 'Infrastructure and deployment specialist', 90000, 140000),
('QA Engineer', 'Quality assurance and testing', 70000, 110000),
('Product Manager', 'Product strategy and roadmap', 100000, 160000),
('Senior Product Manager', 'Senior product strategy and roadmap', 120000, 180000),
('Marketing Manager', 'Marketing campaigns and strategy', 80000, 120000),
('Sales Manager', 'Sales team management', 90000, 140000),
('Sales Representative', 'Direct sales and client relations', 50000, 90000),
('HR Manager', 'Human resources management', 80000, 120000),
('HR Coordinator', 'Human resources coordination', 50000, 70000),
('Finance Manager', 'Financial planning and analysis', 90000, 130000),
('Accountant', 'Financial record keeping and reporting', 55000, 80000),
('Operations Manager', 'Business operations oversight', 85000, 125000),
('Customer Support Manager', 'Customer support team management', 70000, 100000),
('Customer Support Specialist', 'Customer service and support', 40000, 60000),
('Data Analyst', 'Data analysis and reporting', 70000, 100000),
('UX Designer', 'User experience design', 75000, 115000),
('UI Designer', 'User interface design', 70000, 105000);

-- Insert projects
INSERT INTO projects (name, description, start_date, end_date, status) VALUES
('Website Redesign', 'Complete overhaul of company website', '2024-01-15', '2024-06-30', 'active'),
('Mobile App Development', 'Native mobile application for iOS and Android', '2024-02-01', '2024-08-31', 'active'),
('Database Migration', 'Migration from legacy database to modern architecture', '2024-03-01', '2024-07-15', 'active'),
('Customer Portal', 'Self-service portal for customer management', '2024-01-01', '2024-05-31', 'completed'),
('API Integration', 'Third-party API integrations for enhanced functionality', '2024-04-01', '2024-09-30', 'active'),
('Security Audit', 'Comprehensive security review and improvements', '2024-02-15', '2024-05-15', 'completed'),
('Performance Optimization', 'System performance improvements and monitoring', '2024-03-15', '2024-06-15', 'active'),
('Marketing Automation', 'Automated marketing campaigns and lead tracking', '2024-01-10', '2024-04-30', 'completed');

-- Insert sample employees
INSERT INTO employees (employee_number, first_name, last_name, email, phone, hire_date, salary, position_id, department_id) VALUES
-- C-Level
('EMP001', 'Sarah', 'Johnson', 'sarah.johnson@company.com', '555-0101', '2020-01-15', 250000, 1, 1),
('EMP002', 'Michael', 'Chen', 'michael.chen@company.com', '555-0102', '2020-02-01', 220000, 2, 1),

-- Engineering Department
('EMP003', 'David', 'Rodriguez', 'david.rodriguez@company.com', '555-0103', '2020-03-01', 160000, 3, 1),
('EMP004', 'Emily', 'Davis', 'emily.davis@company.com', '555-0104', '2021-01-15', 140000, 6, 1),
('EMP005', 'James', 'Wilson', 'james.wilson@company.com', '555-0105', '2021-02-01', 130000, 7, 1),
('EMP006', 'Lisa', 'Anderson', 'lisa.anderson@company.com', '555-0106', '2021-03-15', 110000, 8, 1),
('EMP007', 'Robert', 'Taylor', 'robert.taylor@company.com', '555-0107', '2022-01-10', 95000, 8, 1),
('EMP008', 'Jennifer', 'Brown', 'jennifer.brown@company.com', '555-0108', '2022-06-01', 85000, 9, 1),
('EMP009', 'Christopher', 'Lee', 'christopher.lee@company.com', '555-0109', '2021-04-01', 120000, 10, 1),
('EMP010', 'Amanda', 'Garcia', 'amanda.garcia@company.com', '555-0110', '2021-07-15', 95000, 11, 1),
('EMP011', 'Daniel', 'Martinez', 'daniel.martinez@company.com', '555-0111', '2022-02-01', 110000, 8, 1),
('EMP012', 'Michelle', 'Thomas', 'michelle.thomas@company.com', '555-0112', '2022-08-15', 75000, 9, 1),

-- Product Management
('EMP013', 'Kevin', 'Jackson', 'kevin.jackson@company.com', '555-0113', '2020-05-01', 140000, 13, 1),
('EMP014', 'Rachel', 'White', 'rachel.white@company.com', '555-0114', '2021-09-01', 115000, 12, 1),

-- Marketing Department
('EMP015', 'Steven', 'Harris', 'steven.harris@company.com', '555-0115', '2020-04-01', 180000, 4, 2),
('EMP016', 'Nicole', 'Clark', 'nicole.clark@company.com', '555-0116', '2021-05-15', 95000, 14, 2),
('EMP017', 'Brian', 'Lewis', 'brian.lewis@company.com', '555-0117', '2022-01-01', 85000, 14, 2),
('EMP018', 'Stephanie', 'Walker', 'stephanie.walker@company.com', '555-0118', '2021-11-01', 85000, 25, 2),
('EMP019', 'Mark', 'Hall', 'mark.hall@company.com', '555-0119', '2022-03-15', 80000, 26, 2),

-- Sales Department
('EMP020', 'Patricia', 'Allen', 'patricia.allen@company.com', '555-0120', '2020-06-01', 200000, 5, 3),
('EMP021', 'Thomas', 'Young', 'thomas.young@company.com', '555-0121', '2021-01-01', 110000, 15, 3),
('EMP022', 'Karen', 'King', 'karen.king@company.com', '555-0122', '2021-08-01', 75000, 16, 3),
('EMP023', 'Joseph', 'Wright', 'joseph.wright@company.com', '555-0123', '2022-02-15', 65000, 16, 3),
('EMP024', 'Susan', 'Lopez', 'susan.lopez@company.com', '555-0124', '2022-05-01', 70000, 16, 3),
('EMP025', 'Anthony', 'Hill', 'anthony.hill@company.com', '555-0125', '2021-12-01', 68000, 16, 3),

-- Human Resources Department
('EMP026', 'Linda', 'Green', 'linda.green@company.com', '555-0126', '2020-07-01', 100000, 17, 4),
('EMP027', 'Charles', 'Adams', 'charles.adams@company.com', '555-0127', '2021-10-01', 60000, 18, 4),
('EMP028', 'Donna', 'Baker', 'donna.baker@company.com', '555-0128', '2022-04-01', 58000, 18, 4),

-- Finance Department
('EMP029', 'Paul', 'Gonzalez', 'paul.gonzalez@company.com', '555-0129', '2020-08-01', 110000, 19, 5),
('EMP030', 'Nancy', 'Nelson', 'nancy.nelson@company.com', '555-0130', '2021-06-01', 68000, 20, 5),
('EMP031', 'Kenneth', 'Carter', 'kenneth.carter@company.com', '555-0131', '2022-01-15', 65000, 20, 5),
('EMP032', 'Betty', 'Mitchell', 'betty.mitchell@company.com', '555-0132', '2021-04-15', 75000, 24, 5),

-- Operations Department
('EMP033', 'Edward', 'Perez', 'edward.perez@company.com', '555-0133', '2020-09-01', 105000, 21, 6),
('EMP034', 'Helen', 'Roberts', 'helen.roberts@company.com', '555-0134', '2021-11-15', 85000, 21, 6),

-- Customer Support Department
('EMP035', 'Jason', 'Turner', 'jason.turner@company.com', '555-0135', '2020-10-01', 85000, 22, 7),
('EMP036', 'Deborah', 'Phillips', 'deborah.phillips@company.com', '555-0136', '2021-07-01', 52000, 23, 7),
('EMP037', 'Ryan', 'Campbell', 'ryan.campbell@company.com', '555-0137', '2022-01-01', 48000, 23, 7),
('EMP038', 'Julie', 'Parker', 'julie.parker@company.com', '555-0138', '2022-03-01', 50000, 23, 7),
('EMP039', 'Jacob', 'Evans', 'jacob.evans@company.com', '555-0139', '2021-12-15', 49000, 23, 7),

-- Product Management Department
('EMP040', 'Marie', 'Edwards', 'marie.edwards@company.com', '555-0140', '2021-05-01', 120000, 12, 8);

-- Update manager relationships
UPDATE employees SET manager_id = 1 WHERE id IN (2, 3, 15, 20, 26, 29, 33, 35); -- C-level reports to CEO
UPDATE employees SET manager_id = 2 WHERE id IN (4, 13); -- Engineering and Product managers report to CTO
UPDATE employees SET manager_id = 3 WHERE id IN (5, 6, 7, 8, 9, 10, 11, 12); -- Engineering team reports to VP Engineering
UPDATE employees SET manager_id = 4 WHERE id IN (5, 6, 7, 8, 9, 10, 11, 12); -- Some engineers report to Engineering Manager
UPDATE employees SET manager_id = 13 WHERE id IN (14, 40); -- Product team reports to Senior PM
UPDATE employees SET manager_id = 15 WHERE id IN (16, 17, 18, 19); -- Marketing team reports to VP Marketing
UPDATE employees SET manager_id = 20 WHERE id IN (21, 22, 23, 24, 25); -- Sales team reports to VP Sales
UPDATE employees SET manager_id = 26 WHERE id IN (27, 28); -- HR team reports to HR Manager
UPDATE employees SET manager_id = 29 WHERE id IN (30, 31, 32); -- Finance team reports to Finance Manager
UPDATE employees SET manager_id = 33 WHERE id IN (34); -- Operations team reports to Operations Manager
UPDATE employees SET manager_id = 35 WHERE id IN (36, 37, 38, 39); -- Support team reports to Support Manager

-- Update department managers
UPDATE departments SET manager_id = 3 WHERE id = 1; -- Engineering
UPDATE departments SET manager_id = 15 WHERE id = 2; -- Marketing
UPDATE departments SET manager_id = 20 WHERE id = 3; -- Sales
UPDATE departments SET manager_id = 26 WHERE id = 4; -- HR
UPDATE departments SET manager_id = 29 WHERE id = 5; -- Finance
UPDATE departments SET manager_id = 33 WHERE id = 6; -- Operations
UPDATE departments SET manager_id = 35 WHERE id = 7; -- Customer Support
UPDATE departments SET manager_id = 13 WHERE id = 8; -- Product Management

-- Insert employee project assignments
INSERT INTO employee_projects (employee_id, project_id, role, start_date, end_date) VALUES
-- Website Redesign Project
(5, 1, 'Tech Lead', '2024-01-15', NULL),
(6, 1, 'Frontend Developer', '2024-01-15', NULL),
(7, 1, 'Backend Developer', '2024-01-15', NULL),
(18, 1, 'UX Designer', '2024-01-15', NULL),
(19, 1, 'UI Designer', '2024-01-15', NULL),

-- Mobile App Development
(4, 2, 'Project Manager', '2024-02-01', NULL),
(8, 2, 'Mobile Developer', '2024-02-01', NULL),
(12, 2, 'Mobile Developer', '2024-02-01', NULL),
(14, 2, 'Product Manager', '2024-02-01', NULL),

-- Database Migration
(9, 3, 'DevOps Lead', '2024-03-01', NULL),  
(11, 3, 'Backend Developer', '2024-03-01', NULL),
(10, 3, 'QA Engineer', '2024-03-01', NULL),

-- Customer Portal (Completed)
(5, 4, 'Tech Lead', '2024-01-01', '2024-05-31'),
(7, 4, 'Backend Developer', '2024-01-01', '2024-05-31'),
(6, 4, 'Frontend Developer', '2024-01-01', '2024-05-31'),
(13, 4, 'Product Manager', '2024-01-01', '2024-05-31'),

-- API Integration
(11, 5, 'Backend Lead', '2024-04-01', NULL),
(7, 5, 'Backend Developer', '2024-04-01', NULL),
(10, 5, 'QA Engineer', '2024-04-01', NULL),

-- Security Audit (Completed)
(9, 6, 'DevOps Lead', '2024-02-15', '2024-05-15'),
(5, 6, 'Security Reviewer', '2024-02-15', '2024-05-15'),

-- Performance Optimization
(9, 7, 'DevOps Lead', '2024-03-15', NULL),
(11, 7, 'Backend Developer', '2024-03-15', NULL),
(32, 7, 'Data Analyst', '2024-03-15', NULL),

-- Marketing Automation (Completed)
(16, 8, 'Marketing Manager', '2024-01-10', '2024-04-30'),
(17, 8, 'Marketing Coordinator', '2024-01-10', '2024-04-30'),
(11, 8, 'Backend Developer', '2024-01-10', '2024-04-30');