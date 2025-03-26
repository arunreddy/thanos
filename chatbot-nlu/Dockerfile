FROM debian:bookworm-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    build-essential \
    python3 \
    python3-dev \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PATH="/root/.local/bin:$PATH"

# Set the working directory
WORKDIR /app

# Copy dependency files
COPY uv.lock pyproject.toml .python-version ./

# Install dependencies with uv
RUN uv sync

# Install Rasa and core dependencies
RUN uv pip install rasa==3.6.15

# Copy Rasa project files
COPY rasa/config.yml .
COPY rasa/domain.yml .
COPY rasa/credentials.yml .
COPY rasa/endpoints.yml .

# Create and copy data directory
COPY rasa/data /app/data

# Install spaCy and download language model
RUN uv run -- python -m pip install spacy && \
    uv run -- python -m spacy download en_core_web_md

# Create a non-root user for running Rasa
RUN useradd -m -u 1001 rasa
RUN chown -R rasa:rasa /app

# Switch to non-root user
USER 1001

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Set healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5005/health || exit 1

# Expose the Rasa server port
EXPOSE 5005

# Command to run when container starts
CMD ["python", "-m", "rasa", "run", "--enable-api", "--cors", "*", "--debug"]