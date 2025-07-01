-- Sample Employee Database Schema for MySQL
-- This script creates the initial schema for employee management

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS employee_sample;
USE employee_sample;

-- Create departments table
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    manager_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create positions table
CREATE TABLE positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    salary_min DECIMAL(10,2),
    salary_max DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create employees table
CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    hire_date DATE NOT NULL,
    salary DECIMAL(10,2),
    position_id INT,
    department_id INT,
    manager_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (position_id) REFERENCES positions(id),
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (manager_id) REFERENCES employees(id)
);

-- Create projects table
CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create employee_projects table for many-to-many relationship
CREATE TABLE employee_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    project_id INT,
    role VARCHAR(50),
    start_date DATE,
    end_date DATE,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_employee_project (employee_id, project_id)
);

-- Create indexes for better performance
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_position ON employees(position_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_hire_date ON employees(hire_date);
CREATE INDEX idx_employee_projects_employee ON employee_projects(employee_id);
CREATE INDEX idx_employee_projects_project ON employee_projects(project_id);

-- Add foreign key constraint for department manager
ALTER TABLE departments ADD CONSTRAINT fk_departments_manager 
    FOREIGN KEY (manager_id) REFERENCES employees(id);

-- Create a view for employee details
CREATE VIEW employee_details AS
SELECT 
    e.id,
    e.employee_number,
    e.first_name,
    e.last_name,
    e.email,
    e.phone,
    e.hire_date,
    e.salary,
    p.title as position_title,
    d.name as department_name,
    CONCAT(m.first_name, ' ', m.last_name) as manager_name,
    e.is_active,
    TIMESTAMPDIFF(YEAR, e.hire_date, CURDATE()) as years_of_service
FROM employees e
LEFT JOIN positions p ON e.position_id = p.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN employees m ON e.manager_id = m.id;

-- Create stored procedure to get department statistics
DELIMITER //
CREATE PROCEDURE GetDepartmentStats(IN dept_id INT)
BEGIN
    SELECT 
        d.name as department_name,
        COUNT(e.id) as employee_count,
        AVG(e.salary) as avg_salary,
        MIN(e.hire_date) as oldest_hire_date,
        MAX(e.hire_date) as newest_hire_date
    FROM departments d
    LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = TRUE
    WHERE d.id = dept_id
    GROUP BY d.id, d.name;
END //
DELIMITER ;

-- Create function to calculate employee tenure
DELIMITER //
CREATE FUNCTION CalculateTenure(hire_date DATE) 
RETURNS VARCHAR(50)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE years INT;
    DECLARE months INT;
    DECLARE result VARCHAR(50);
    
    SET years = TIMESTAMPDIFF(YEAR, hire_date, CURDATE());
    SET months = TIMESTAMPDIFF(MONTH, hire_date, CURDATE()) % 12;
    
    SET result = CONCAT(years, ' years, ', months, ' months');
    RETURN result;
END //
DELIMITER ;