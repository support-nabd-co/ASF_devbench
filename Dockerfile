# Multi-stage Dockerfile for ASF Devbench Manager (Flask Version)
# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Clean install frontend dependencies
RUN npm ci --only=production

# Copy frontend source code
COPY frontend/ ./

# Build the React application
RUN npm run build

# Stage 2: Python Flask backend
FROM python:3.11-slim AS production

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Create app directory and user
WORKDIR /app
RUN groupadd -r flask && useradd -r -g flask flask

# Copy Python requirements and install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy Flask application files
COPY app.py ./
COPY provision_vm.sh ./
COPY .env.flask ./.env

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Make provision script executable
RUN chmod +x provision_vm.sh

# Create directory for SQLite database
RUN mkdir -p /app/data && chown -R flask:flask /app/data

# Change ownership to flask user
RUN chown -R flask:flask /app

# Switch to non-root user
USER flask

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Set environment variables
ENV FLASK_ENV=production
ENV DATABASE_URL=sqlite:///data/devbench.db
ENV PYTHONPATH=/app

# Start the Flask application
CMD ["python", "app.py"]
