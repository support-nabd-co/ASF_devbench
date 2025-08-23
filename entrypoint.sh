#!/bin/bash
set -e

# Create required directories with proper permissions
mkdir -p /app/data /app/logs
chown -R 1000:1000 /app/data /app/logs

# Function to wait for database to be ready
wait_for_db() {
    echo "Waiting for database to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if python3 -c "import sqlite3; conn = sqlite3.connect('/app/data/devbench.db'); conn.close()" &>/dev/null; then
            echo "Database is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        echo "Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 2
    done
    
    echo "Failed to connect to database after $max_attempts attempts"
    return 1
}

# Initialize database if it doesn't exist
if [ ! -f "/app/data/devbench.db" ]; then
    echo "Initializing database..."
    flask db upgrade
    flask init-db
    echo "Database initialized successfully"
fi

# Run database migrations
echo "Running database migrations..."
flask db upgrade

# Set environment variables
export FLASK_APP=app.py
export FLASK_ENV=production

# Wait for database to be ready
wait_for_db || exit 1

# Start the application
echo "Starting application..."
exec gunicorn \
    --bind 0.0.0.0:3001 \
    --workers 2 \
    --threads 4 \
    --worker-class gthread \
    --access-logfile - \
    --error-logfile - \
    --log-level debug \
    app:app