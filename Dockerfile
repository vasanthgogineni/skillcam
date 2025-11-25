# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Install system dependencies including ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install gunicorn for production server
RUN pip install --no-cache-dir gunicorn

# Copy application code
COPY app.py .

# Create directories for uploads and frames
RUN mkdir -p uploads frames

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py

# Expose port (Railway will set PORT env var automatically)
EXPOSE 5002

# Health check (uses PORT env var or defaults to 5002)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; import os; port=os.getenv('PORT', '5002'); requests.get(f'http://localhost:{port}/')" || exit 1

# Run with gunicorn in production
# Railway automatically sets PORT env var, so we use it directly
# If PORT is not set, default to 5002
CMD gunicorn --bind "0.0.0.0:${PORT:-5002}" --workers 2 --timeout 300 --access-logfile - --error-logfile - app:app

