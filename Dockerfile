# Multi-stage Dockerfile for ASF Devbench Manager (Flask Version)
# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
# Use npm install instead of npm ci for better compatibility
RUN npm install --only=production

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
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory and user with specific UID/GID for volume permissions
WORKDIR /app
RUN groupadd -g 1000 flask && useradd -u 1000 -g 1000 -r flask

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

# Create directory for SQLite database with proper permissions
RUN mkdir -p /app/data && \
    chown -R flask:flask /app && \
    chmod -R 755 /app/data

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Set environment variables
ENV FLASK_ENV=production
ENV DATABASE_URL=sqlite:///data/devbench.db
ENV PYTHONPATH=/app

# Create a startup script that ensures proper permissions
RUN echo '#!/bin/bash\n\
# Ensure data directory exists and has proper permissions\n\
mkdir -p /app/data\n\
chown -R flask:flask /app/data\n\
chmod -R 755 /app/data\n\
\n\
# Switch to flask user and start the application\n\
exec su flask -c "python /app/app.py"\n\
' > /app/start.sh && chmod +x /app/start.sh

# Start the Flask application with proper permission handling
CMD ["/app/start.sh"]
