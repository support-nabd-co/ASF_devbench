#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Database Debugging Tool ===${NC}"
echo "Running as: $(whoami)"
echo "Current directory: $(pwd)"

# Check if running in container
if [ -f /.dockerenv ]; then
    echo -e "${GREEN}✓ Running inside Docker container${NC}"
    CONTAINER_ID=$(cat /etc/hostname)
    echo "Container ID: ${CONTAINER_ID}"
else
    echo -e "${YELLOW}⚠ Not running inside Docker container${NC}"
    
    # Check if docker is installed and running
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker is not installed${NC}"
        exit 1
    fi
    
    # Get container ID if devbench-manager is running
    CONTAINER_ID=$(docker ps -q -f "name=devbench-manager")
    if [ -z "$CONTAINER_ID" ]; then
        echo -e "${RED}✗ devbench-manager container is not running${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Found devbench-manager container: ${CONTAINER_ID}${NC}"
    
    # Copy this script into the container and run it there
    echo -e "\n${YELLOW}Running diagnostics inside container...${NC}"
    docker cp "$0" ${CONTAINER_ID}:/debug-db.sh
    docker exec -it ${CONTAINER_ID} chmod +x /debug-db.sh
    docker exec -it ${CONTAINER_ID} /debug-db.sh
    exit $?
fi

# From here on, we're running inside the container

echo -e "\n${YELLOW}=== System Information ===${NC}"
uname -a

# Check Python environment
echo -e "\n${YELLOW}=== Python Environment ===${NC}
python --version
pip list | grep -E "flask|sqlalchemy|flask-sqlalchemy|flask-migrate" || echo "No relevant packages found"

# Check database directory
echo -e "\n${YELLOW}=== Database Directory ===${NC}
ls -la /app/data/

# Check write permissions
echo -e "\n${YELLOW}=== Write Permissions Test ===${NC}
touch /app/data/test_write && rm /app/data/test_write && \
    echo -e "${GREEN}✓ Write test successful${NC}" || \
    echo -e "${RED}✗ Write test failed${NC}"

# Check migrations
echo -e "\n${YELLOW}=== Database Migrations ===${NC}
if [ -d "/app/migrations" ]; then
    echo "Migrations directory exists:"
    ls -la /app/migrations/
    echo -e "\nMigration versions:"
    ls -la /app/migrations/versions/ 2>/dev/null || echo "No versions directory found"
else
    echo -e "${YELLOW}⚠ Migrations directory not found${NC}"
fi

# Check database file
DB_FILE="/app/data/devbench.db"
echo -e "\n${YELLOW}=== Database File ===${NC}"
if [ -f "$DB_FILE" ]; then
    echo -e "${GREEN}✓ Database file exists: ${DB_FILE}${NC}"
    ls -la "$DB_FILE"
    
    # Check SQLite integrity
    echo -e "\n${YELLOW}=== Database Integrity Check ===${NC}"
    if command -v sqlite3 &> /dev/null; then
        if sqlite3 "$DB_FILE" "PRAGMA integrity_check;" 2>/dev/null; then
            echo -e "${GREEN}✓ Database integrity check passed${NC}"
            
            # List tables
            echo -e "\n${YELLOW}=== Database Tables ===${NC}"
            sqlite3 "$DB_FILE" ".tables" 2>/dev/null || echo "Failed to list tables"
            
            # Check users table
            echo -e "\n${YELLOW}=== Users Table ===${NC}"
            sqlite3 "$DB_FILE" "SELECT * FROM user;" 2>/dev/null || echo "Failed to query users table"
        else
            echo -e "${RED}✗ Database integrity check failed${NC}"
        fi
    else
        echo "sqlite3 command not available, skipping database checks"
    fi
else
    echo -e "${YELLOW}⚠ Database file not found: ${DB_FILE}${NC}"
    
    # Try to create a test database
    echo -e "\n${YELLOW}=== Test Database Creation ===${NC}"
    if touch "$DB_FILE"; then
        echo -e "${GREEN}✓ Successfully created test database file${NC}"
        
        # Try to initialize the database
        echo -e "\n${YELLOW}=== Attempting Database Initialization ===${NC}"
        export FLASK_APP=app.py
        export FLASK_ENV=production
        
        # Run migrations if migrations directory exists
        if [ -d "/app/migrations" ]; then
            echo "Running database migrations..."
            flask db upgrade 2>&1 | tee /tmp/migration.log
            
            if [ ${PIPESTATUS[0]} -eq 0 ]; then
                echo -e "${GREEN}✓ Database initialized successfully${NC}"
            else
                echo -e "${RED}✗ Database initialization failed${NC}"
                echo -e "\nMigration log:"
                cat /tmp/migration.log
            fi
        else
            echo -e "${YELLOW}⚠ Migrations directory not found, cannot initialize database${NC}"
        fi
        
        # Clean up test file
        rm -f "$DB_FILE"
    else
        echo -e "${RED}✗ Failed to create test database file${NC}"
    fi
fi

echo -e "\n${YELLOW}=== Environment Variables ===${NC}
printenv | grep -E 'FLASK|DATABASE|SECRET|PYTHON|GUNICORN'

echo -e "\n${YELLOW}=== Disk Space ===${NC}
df -h .

echo -e "\n${YELLOW}=== File Descriptors ===${NC}
ulimit -n

echo -e "\n${GREEN}=== Debugging Complete ===${NC}"
