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

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy only necessary files for the build
COPY app.py .
COPY migrations/ ./migrations/
COPY entrypoint.sh .
COPY init-database.sh .
COPY provision_vm.sh .

# Create necessary directories with proper permissions
RUN mkdir -p /app/migrations /app/data /app/logs /app/data/backups /app/frontend/build && \
    chown -R 1000:1000 /app && \
    chmod -R 755 /app && \
    chmod +x /app/*.sh

# Set entrypoint script
COPY entrypoint.sh .
RUN chmod +x /app/entrypoint.sh

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Copy database initialization script
COPY init-database.sh .

# Expose the port the app runs on
EXPOSE 3001

# Set the entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command to run the application
CMD ["gunicorn", "--bind", "0.0.0.0:3001", "app:app"]