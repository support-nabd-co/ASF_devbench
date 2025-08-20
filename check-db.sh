#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Database file paths
DB_FILE="/app/data/devbench.db"
BACKUP_DIR="/app/data/backups"

# Function to print section header
section() {
    echo -e "\n${YELLOW}=== $1 ===${NC}"
}

# Function to print success message
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error message
error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

# Check if running as root
if [ "$(id -u)" -eq 0 ]; then
    echo "Running as root, switching to user with ID 1000"
    exec gosu 1000 "$0" "$@"
fi

# Check database directory
section "Checking database directory"
echo "Current user: $(whoami)"
echo "Current directory: $(pwd)"
echo "Database file: $DB_FILE"

# Check if directory exists
if [ ! -d "$(dirname "$DB_FILE")" ]; then
    error "Database directory does not exist: $(dirname "$DB_FILE")"
else
    success "Database directory exists: $(dirname "$DB_FILE")"
    ls -la "$(dirname "$DB_FILE")"
fi

# Check write permissions
echo -e "\nTesting write permissions..."
TEST_FILE="$(dirname "$DB_FILE")/test_write.$$"
if touch "$TEST_FILE" 2>/dev/null; then
    rm -f "$TEST_FILE"
    success "Write permissions are OK"
else
    error "Cannot write to $(dirname "$DB_FILE")"
fi

# Check database file
section "Checking database file"
if [ -f "$DB_FILE" ]; then
    success "Database file exists"
    ls -la "$DB_FILE"
    
    # Check if SQLite database is valid
    echo -e "\nChecking database integrity..."
    if sqlite3 "$DB_FILE" "PRAGMA integrity_check;" 2>/dev/null; then
        success "Database integrity check passed"
        
        # List tables
        echo -e "\nDatabase tables:"
        sqlite3 "$DB_FILE" ".tables" || error "Failed to list tables"
        
        # Check users table
        echo -e "\nUsers:"
        sqlite3 "$DB_FILE" "SELECT id, username, is_admin FROM user;" 2>/dev/null || \
            error "Failed to query users table"
    else
        error "Database is corrupted or not a valid SQLite database"
    fi
else
    echo "Database file does not exist"
    
    # Try to create a test database
    echo -e "\nAttempting to create a test database..."
    if sqlite3 "$DB_FILE" "CREATE TABLE test (id INTEGER PRIMARY KEY); DROP TABLE test;" 2>/dev/null; then
        success "Successfully created test database"
        rm -f "$DB_FILE"
    else
        error "Failed to create test database"
    fi
fi

# Check backup directory
section "Checking backup directory"
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR" || error "Failed to create backup directory"
    chmod 755 "$BACKUP_DIR" || error "Failed to set permissions on backup directory"
else
    success "Backup directory exists"
    ls -la "$BACKUP_DIR"
fi

# Check environment variables
section "Environment Variables"
printenv | grep -E 'FLASK|DATABASE|SECRET|PYTHON|GUNICORN'

# Check disk space
section "Disk Space"
df -h .

# Check file descriptors
section "File Descriptors"
ulimit -n

success "\nDatabase check completed successfully"
echo -e "\nIf you're still having issues, try these steps:"
echo "1. Stop all containers: docker-compose down"
echo "2. Remove existing database: sudo rm -rf data/"
echo "3. Rebuild and start: ./fix-build-safe.sh"
