#!/bin/sh
set -e

# Only run migrations if MIGRATE environment variable is set to true
if [ "$MIGRATE" = "true" ]; then
    echo "Running database migrations..."
    flask db upgrade
fi

# Start the application
if [ "$#" -gt 0 ]; then
    exec "$@"
else
    # Default command: start the Flask application
    exec gunicorn -b :9090 --access-logfile - --error-logfile - app:app
fi