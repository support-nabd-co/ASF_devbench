#!/bin/bash

set -e

echo "=== Setting up database migrations ==="

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Set environment variables
export FLASK_APP=app.py
export FLASK_ENV=production

# Create necessary directories
echo "Creating required directories..."
mkdir -p migrations/versions

# Initialize migrations if not already done
if [ ! -d "migrations/versions" ]; then
    echo "Initializing Flask-Migrate..."
    flask db init
    
    # Create initial migration
    echo "Creating initial migration..."
    flask db migrate -m "Initial migration"
    
    # Set proper permissions
    chmod -R 755 migrations
    chown -R 1000:1000 migrations
    
    echo "✅ Migrations initialized successfully"
else
    echo "✅ Migrations already initialized"
fi

echo "=== Migration setup complete ==="
echo "You can now run database upgrades with: flask db upgrade"
