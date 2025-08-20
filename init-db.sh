#!/bin/bash

# Database file paths
DB_FILE="/app/data/devbench.db"
BACKUP_DIR="/app/data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/devbench_$TIMESTAMP.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists and has tables
if [ -f "$DB_FILE" ]; then
    echo "Database exists, creating backup..."
    # Check if database is not empty
    if sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' LIMIT 1;" | grep -q .; then
        echo "Backing up existing database to $BACKUP_FILE"
        cp "$DB_FILE" "$BACKUP_FILE"
        echo "Backup created successfully at $BACKUP_FILE"
    else
        echo "Database file exists but is empty, initializing new database..."
        rm -f "$DB_FILE"
        flask db upgrade
    fi
else
    echo "No database found, initializing new database..."
    flask db upgrade
fi

# Ensure proper permissions
chmod 644 "$DB_FILE" 2>/dev/null || true
chmod 755 "$BACKUP_DIR" 2>/dev/null || true
chmod 644 "$BACKUP_FILE" 2>/dev/null || true

echo "Database initialization complete"