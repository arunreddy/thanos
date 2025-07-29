# Justfile for Thanos Docker Compose

# Build and start all services
up:
    docker compose up --build

# Start all services (without building)
start:
    docker compose up

# Stop all services
down:
    docker compose down

restart:
    docker compose down
    docker compose up --build -d

# Build all images
build:
    docker compose build chatbot-web chatbot-api chatbot-nlu action_server

# Build specific service
build-web:
    docker compose build chatbot-web

build-api:
    docker compose build chatbot-api

build-nlu:
    docker compose build chatbot-nlu

build-actions:
    docker compose build action_server

# Run all tests with coverage
test:
    @echo "Running chatbot-web tests..."
    docker exec thanos-chatbot-web npx vitest run --environment=jsdom --coverage
    @echo "\nRunning chatbot-api tests..."
    docker exec thanos-chatbot-api uv run pytest /app/tests --cov=/app/app --cov-report=term-missing

# Run individual service tests
test-web:
    docker exec thanos-chatbot-web npx vitest run --environment=jsdom --coverage

test-api:
    docker exec thanos-chatbot-api uv run pytest /app/tests --cov=/app/app --cov-report=term-missing

# Start infrastructure only (Redis, PostgreSQL)
infra:
    docker compose up redis postgres -d

# Start sample databases for testing
samples:
    docker compose up sample-employee-postgres sample-employee-mysql sample-employee-mongo -d

# Clean up everything (containers, volumes, networks)
clean:
    docker compose down -v --remove-orphans
    docker system prune -f
