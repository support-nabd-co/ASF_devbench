#!/bin/bash

set -e  # Exit on any error

# Database file paths
DB_FILE="/app/data/devbench.db"
BACKUP_DIR="/app/data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/devbench_$TIMESTAMP.db"

# Debug info
echo "=== Database Initialization Debug Info ==="
echo "Current user: $(whoami)"
echo "Current directory: $(pwd)"
echo "Environment variables:"
printenv | sort
echo "======================================="

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"
chmod 755 "$BACKUP_DIR"

# Set proper ownership
chown -R 1000:1000 /app/data /app/logs || {
    echo "ERROR: Failed to set ownership on /app/data or /app/logs"
    exit 1
}

# Check database directory permissions
echo "=== Checking permissions ==="
ls -la /app/data/
touch /app/data/test_write && rm /app/data/test_write && echo "Write test successful" || echo "Write test failed"

# Check if database exists and has tables
if [ -f "$DB_FILE" ]; then
    echo "Database exists at $DB_FILE"
    echo "File permissions: $(ls -la "$DB_FILE")"
    
    # Check if database is accessible
    if sqlite3 "$DB_FILE" ".tables" 2>/dev/null | grep -q .; then
        echo "Database is accessible, creating backup..."
        cp -v "$DB_FILE" "$BACKUP_FILE"
        chmod 644 "$BACKUP_FILE"
        echo "Backup created successfully at $BACKUP_FILE"
    else
        echo "Database file exists but is corrupted or not accessible, removing..."
        rm -f "$DB_FILE"
        echo "Initializing new database..."
        flask db upgrade
    fi
else
    echo "No database found at $DB_FILE, initializing new database..."
    mkdir -p "$(dirname "$DB_FILE")"
    touch "$DB_FILE"
    chmod 644 "$DB_FILE"
    flask db upgrade
fi

# Verify database initialization
if [ -f "$DB_FILE" ]; then
    echo "Database initialization completed successfully"
    echo "Final database file permissions: $(ls -la "$DB_FILE")"
    echo "Database tables:"
    sqlite3 "$DB_FILE" ".tables" || echo "Failed to list tables"
else
    echo "ERROR: Database file was not created!"
    exit 1
fi

echo "Database initialization complete"