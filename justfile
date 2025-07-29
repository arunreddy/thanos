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

