#!/bin/bash

set -x  # Enable debug output
set -e  # Exit on error

echo "=== Starting Database Initialization ==="
echo "Current user: $(whoami)"
echo "Working directory: $(pwd)"

# Database file paths
DB_FILE="/app/data/devbench.db"
BACKUP_DIR="/app/data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/devbench_$TIMESTAMP.db"

# Create backup directory if it doesn't exist
echo "=== Ensuring backup directory exists ==="
mkdir -p "$BACKUP_DIR"
chmod 755 "$BACKUP_DIR"
chown -R 1000:1000 "$BACKUP_DIR"

# Set proper ownership
echo "=== Setting directory permissions ==="
chown -R 1000:1000 /app/data /app/logs || {
    echo "ERROR: Failed to set ownership on /app/data or /app/logs"
    ls -la /app
    exit 1
}

# Check database directory permissions
echo "=== Verifying permissions ==="
ls -la /app/data/

echo "=== Testing write access ==="
touch /app/data/test_write && rm /app/data/test_write && echo "✅ Write test successful" || echo "❌ Write test failed"

# Check if database exists and has tables
if [ -f "$DB_FILE" ]; then
    echo "=== Database file exists ==="
    ls -la "$DB_FILE"
    
    # Check if database is accessible
    echo "=== Checking database integrity ==="
    if sqlite3 "$DB_FILE" ".tables" 2>/dev/null | grep -q .; then
        echo "✅ Database is accessible"
        echo "=== Creating backup ==="
        cp -v "$DB_FILE" "$BACKUP_FILE"
        chmod 644 "$BACKUP_FILE"
        echo "✅ Backup created at $BACKUP_FILE"
    else
        echo "⚠️ Database file exists but is corrupted or not accessible"
        echo "=== Removing corrupted database ==="
        rm -vf "$DB_FILE"
        echo "=== Initializing new database ==="
        flask db upgrade
    fi
else
    echo "=== No database found, initializing new database ==="
    mkdir -p "$(dirname "$DB_FILE")"
    touch "$DB_FILE"
    chmod 644 "$DB_FILE"
    
    # Set environment variables for Flask
    export FLASK_APP=app.py
    export FLASK_ENV=production
    
    echo "=== Running database migrations ==="
    set +e  # Temporarily disable exit on error
    flask db upgrade 2>&1 | tee /app/logs/db_init.log
    MIGRATION_STATUS=${PIPESTATUS[0]}
    set -e  # Re-enable exit on error
    
    if [ $MIGRATION_STATUS -ne 0 ]; then
        echo "❌ Database migration failed with status $MIGRATION_STATUS"
        echo "=== Migration log ==="
        cat /app/logs/db_init.log
        exit $MIGRATION_STATUS
    fi
    
    echo "✅ Database initialized successfully"
fi

# Verify database initialization
echo "=== Verifying database ==="
if [ -f "$DB_FILE" ]; then
    echo "✅ Database file exists at $DB_FILE"
    echo "=== Database file permissions ==="
    ls -la "$DB_FILE"
    
    echo "=== Database tables ==="
    sqlite3 "$DB_FILE" ".tables" || echo "❌ Failed to list tables"
    
    echo "=== Users table content ==="
    sqlite3 "$DB_FILE" "SELECT * FROM user;" || echo "❌ Failed to query users table"
else
    echo "❌ Database file was not created!"
    exit 1
fi

echo "=== Database initialization complete ==="