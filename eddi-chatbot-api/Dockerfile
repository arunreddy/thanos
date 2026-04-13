FROM python:3.11-slim-bookworm

RUN groupadd -r appuser && useradd -r -g appuser appuser

RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PATH="/root/.local/bin:/root/.venv/bin:$PATH"

WORKDIR /app

COPY uv.lock pyproject.toml ./

RUN uv sync

COPY main.py ./
COPY app ./app
COPY tests ./tests

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
