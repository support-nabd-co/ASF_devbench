#!/bin/sh
set -e

# Only run migrations if MIGRATE environment variable is set to true
if [ "$MIGRATE" = "true" ]; then
    echo "Running database migrations..."
    flask db upgrade
fi

# Start the application
exec "$@"