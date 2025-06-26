# Chatbot API

A FastAPI-based backend for a chatbot application that communicates with a Rasa NLU backend.

## Features

- RESTful API endpoints for chat interactions
- Integration with Rasa backend
- Conversation history management
- Message formatting and processing
- Support for buttons and interactive elements

## Setup and Installation

### Prerequisites

- Python 3.13+
- [Rasa](https://rasa.com/) backend running (optional for development with mocks)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pip install -e .
```

Or install with development dependencies:

```bash
pip install -e ".[dev]"
```

## Running the API

Start the FastAPI server:

```bash
python main.py
```

This will start the server on http://localhost:9000 by default.

## API Endpoints

- `POST /api/chat/send`: Send a message to the chatbot
- `GET /api/chat/conversations/{id}`: Get conversation history
- `GET /api/chat/conversations`: List all conversations
- `DELETE /api/chat/conversations/{id}`: Delete a conversation

## Testing

The project uses pytest for testing. To run tests:

```bash
# Run all tests
python -m pytest tests/

# Run tests with coverage report
python -m pytest tests/ --cov=app --cov=main --cov-report=term

# Generate HTML coverage report
python -m pytest tests/ --cov=app --cov=main --cov-report=html
```

Current test coverage: 96%

## Project Structure

- `app/api/routes.py`: API endpoint definitions
- `app/connectors/rasa_connector.py`: Integration with Rasa backend
- `app/services/chat_service.py`: Core business logic
- `main.py`: FastAPI application setup
- `tests/`: Test files

## Docker

The project includes a Dockerfile for containerization. Build and run with:

```bash
docker build -t chatbot-api .
docker run -p 9000:9000 chatbot-api
```

## Contributing

Contributions are welcome! Please add tests for any new features or bug fixes.