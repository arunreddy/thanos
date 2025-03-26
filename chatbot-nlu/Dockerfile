FROM python:3.10-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PYTHONUNBUFFERED=1
ENV PATH="/root/.local/bin:$PATH"

# Set the working directory
WORKDIR /app

# Copy dependency files
COPY uv.lock pyproject.toml .python-version ./

# Install dependencies with uv
RUN uv sync

# # Install Rasa and core dependencies
# RUN uv pip install rasa==3.6.15

# Copy Rasa project files
COPY rasa/config.yml .
COPY rasa/domain.yml .
COPY rasa/credentials.yml .
COPY rasa/endpoints.yml .


# Create and copy data directory
COPY rasa/data /app/data

ENV PATH="/root/.local/bin:/app/.venv/bin:$PATH"

COPY scripts/start-server.sh .
RUN chmod +x start-server.sh

CMD ["./start-server.sh"]
