// Sample execution plan data for testing visualization components

export const samplePostgresPlan = {
  "metadata": {
    "query": "SELECT first_name, last_name, email FROM employees WHERE department_id = 1;",
    "timestamp": "c9522313-3271-4f39-9bbf-ef93a42018c2",
    "connection_endpoint": "sample-employee-postgres:5432"
  },
  "execution_plan": {
    "json": [
      {
        "Plan": {
          "Node Type": "Seq Scan",
          "Parallel Aware": false,
          "Async Capable": false,
          "Relation Name": "employees",
          "Schema": "public",
          "Alias": "employees",
          "Startup Cost": 0.0,
          "Total Cost": 1.5,
          "Plan Rows": 14,
          "Plan Width": 37,
          "Actual Startup Time": 0.344,
          "Actual Total Time": 0.348,
          "Actual Rows": 14,
          "Actual Loops": 1,
          "Output": [
            "first_name",
            "last_name",
            "email"
          ],
          "Filter": "(employees.department_id = 1)",
          "Rows Removed by Filter": 26,
          "Shared Hit Blocks": 0,
          "Shared Read Blocks": 1,
          "Shared Dirtied Blocks": 0,
          "Shared Written Blocks": 0,
          "Local Hit Blocks": 0,
          "Local Read Blocks": 0,
          "Local Dirtied Blocks": 0,
          "Local Written Blocks": 0,
          "Temp Read Blocks": 0,
          "Temp Written Blocks": 0
        },
        "Planning": {
          "Shared Hit Blocks": 167,
          "Shared Read Blocks": 1,
          "Shared Dirtied Blocks": 0,
          "Shared Written Blocks": 0,
          "Local Hit Blocks": 0,
          "Local Read Blocks": 0,
          "Local Dirtied Blocks": 0,
          "Local Written Blocks": 0,
          "Temp Read Blocks": 0,
          "Temp Written Blocks": 0
        },
        "Planning Time": 0.626,
        "Triggers": [],
        "Execution Time": 0.384
      }
    ],
    "text": "Seq Scan on public.employees  (cost=0.00..1.50 rows=14 width=37) (actual time=0.007..0.010 rows=14 loops=1)\n  Output: first_name, last_name, email\n  Filter: (employees.department_id = 1)\n  Rows Removed by Filter: 26\n  Buffers: shared hit=1\nPlanning Time: 0.035 ms\nExecution Time: 0.015 ms"
  },
  "analyzed": true,
  "cost": 1.5,
  "rows": 14,
  "execution_time": 0.384,
  "planning_time": 0.626
};

export const sampleMySQLPlan = {
  "metadata": {
    "query": "SELECT e.first_name, e.last_name, p.title, p.salary_min, p.salary_max\nFROM employees e\nINNER JOIN positions p ON e.position_id = p.id\nWHERE p.salary_max > 100000;",
    "timestamp": "8500ca4c-275f-4d41-80ce-ee4595a700ad",
    "connection_endpoint": "sample-employee-mysql:3306"
  },
  "execution_plan": {
    "json": {
      "query_block": {
        "select_id": 1,
        "cost_info": {
          "query_cost": "2.20"
        },
        "nested_loop": [
          {
            "table": {
              "table_name": "e",
              "access_type": "ALL",
              "possible_keys": [
                "idx_employees_position"
              ],
              "rows_examined_per_scan": 1,
              "rows_produced_per_join": 1,
              "filtered": "100.00",
              "cost_info": {
                "read_cost": "1.00",
                "eval_cost": "0.10",
                "prefix_cost": "1.10",
                "data_read_per_join": "1008"
              },
              "used_columns": [
                "first_name",
                "last_name",
                "position_id"
              ],
              "attached_condition": "(`employee_sample`.`e`.`position_id` is not null)"
            }
          },
          {
            "table": {
              "table_name": "p",
              "access_type": "eq_ref",
              "possible_keys": [
                "PRIMARY"
              ],
              "key": "PRIMARY",
              "used_key_parts": [
                "id"
              ],
              "key_length": "4",
              "ref": [
                "employee_sample.e.position_id"
              ],
              "rows_examined_per_scan": 1,
              "rows_produced_per_join": 0,
              "filtered": "33.33",
              "cost_info": {
                "read_cost": "1.00",
                "eval_cost": "0.03",
                "prefix_cost": "2.20",
                "data_read_per_join": "146"
              },
              "used_columns": [
                "id",
                "title",
                "salary_min",
                "salary_max"
              ],
              "attached_condition": "(`employee_sample`.`p`.`salary_max` > 100000.00)"
            }
          }
        ]
      }
    },
    "text": "id  select_type  table  partitions  type  possible_keys  key  key_len  ref  rows  filtered  Extra\n1  SIMPLE  e  None  ALL  idx_employees_position  None  None  None  1  100.0  Using where\n1  SIMPLE  p  None  eq_ref  PRIMARY  PRIMARY  4  employee_sample.e.position_id  1  33.33  Using where"
  },
  "analyzed": false,
  "cost": "See plan details",
  "rows": "See plan details",
  "note": "MySQL execution plan (query not executed)"
};

export const sampleMongoDBPlan = {
  "metadata": {
    "query": "db.employees.find({\"department_id\": 1});",
    "timestamp": "f73f6cc4-46ab-4b5c-a105-8d347931b48d",
    "connection_endpoint": "sample-employee-mongo:27017"
  },
  "execution_plan": {
    "query": "db.employees.find({\"department_id\": 1});",
    "collection": "employees",
    "operation": "find({\"department_id\": 1});",
    "stats": {
      "collection_size": 6232,
      "document_count": 17,
      "avg_doc_size": 366,
      "index_count": 11
    }
  },
  "analyzed": true,
  "database": "employee_sample",
  "note": "MongoDB query analysis - collection statistics provided"
};

export const getAllSamplePlans = () => ({
  postgresql: samplePostgresPlan,
  mysql: sampleMySQLPlan,
  mongodb: sampleMongoDBPlan,
});