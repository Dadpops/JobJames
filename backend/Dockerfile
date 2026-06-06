FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Default data directory for the SQLite volume mount
RUN mkdir -p /data

# Railway injects $PORT at runtime; default to 8000 for local docker-compose
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
