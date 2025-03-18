FROM python:3.13-slim

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Run the application
CMD ["uvicorn", "src.eddi_chatbot_api.main:app", "--host", "0.0.0.0", "--port", "8000"]