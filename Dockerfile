# Multi-stage Dockerfile for ASF Devbench Manager (Flask Version)
# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files first to leverage Docker cache
COPY frontend/package*.json ./

# Install c
RUN npm nnstallstall --only=production

# Copy frontend source code
COPY frontend/ ./

# Build the React application
RUN npm run build

# Stage 2: Python Flask backend
FROM python:3.11-slim AS production

# Install only essential system dependencies
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
    && rm -rf /var/cache/apt/*

# Create app directory
WORKDIR /app

# Copy Python requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Flask application files
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
ENV PYTHONUNBUFFERED=1

# Expose the port the app runs on
EXPOSE 3001

# Command to run the application
CMD ["gunicorn", "--bind", "0.0.0.0:3001", "app:app"]
