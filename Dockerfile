# Multi-stage Dockerfile for ASF Devbench Manager (Flask Version)

# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files first to leverage Docker cache
COPY frontend/package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy frontend source code
COPY frontend/ ./

# Build the React application
RUN npm run build

# Stage 2: Python Flask backend
FROM python:3.11-slim AS production

# Set environment variables to prevent Python from generating .pyc files
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Install system dependencies in a single layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    libffi-dev \
    curl \
    sqlite3 \
    sshpass \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && rm -rf /var/cache/apt/archives/* \
    && rm -rf /usr/share/doc/* \
    && rm -rf /usr/share/man/* \
    && rm -rf /tmp/*

# Create and set working directory
WORKDIR /app

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application files
COPY app.py .
COPY provision_vm.sh .
COPY .env.flask ./.env

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Make provision script executable
RUN chmod +x provision_vm.sh

# Create necessary directories
RUN mkdir -p /app/data /app/logs

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Expose the port the app runs on
EXPOSE 3001

# Command to run the application
CMD ["gunicorn", "--bind", "0.0.0.0:3001", "--workers", "2", "--threads", "2", "--worker-class", "gthread", "app:app"]