#!/bin/sh
set -e

# Create data directory if it doesn't exist
mkdir -p /app/data

# Create database if it doesn't exist
if [ ! -f "/app/data/devbench.db" ]; then
    echo "Creating new database..."
    sqlite3 /app/data/devbench.db "VACUUM;"
    chmod 666 /app/data/devbench.db
    
    # Initialize database schema if models are defined
    if [ "$MIGRATE" = "true" ]; then
        echo "Initializing database schema..."
        flask db init
        flask db migrate -m "Initial database"
        flask db upgrade
    fi
fi

# Start the application
if [ "$#" -gt 0 ]; then
    exec "$@"
else
    # Default command: start the Flask application
    exec gunicorn -b :9090 --access-logfile - --error-logfile - app:app
fi