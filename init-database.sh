#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Database Initialization Script ===${NC}"

# Check if running in container
if [ ! -f /.dockerenv ]; then
    echo -e "${RED}✗ This script must be run inside the container${NC}"
    echo "Please run: docker exec -it devbench-manager /app/init-database.sh"
    exit 1
fi

# Set environment variables
export FLASK_APP=app.py
export FLASK_ENV=production

# Create necessary directories
echo -e "\n${YELLOW}=== Creating Directories ===${NC}"
mkdir -p /app/data /app/logs /app/migrations/versions
chown -R 1000:1000 /app/data /app/logs /app/migrations
chmod -R 755 /app/data /app/logs /app/migrations

# Initialize migrations if not already done
echo -e "\n${YELLOW}=== Setting Up Migrations ===${NC}"
if [ ! -f "/app/migrations/README" ]; then
    echo "Initializing database migrations..."
    flask db init
else
    echo "Migrations already initialized"
fi

# Create initial migration if needed
echo -e "\n${YELLOW}=== Creating Database Migration ===${NC}"
if [ ! -f "/app/migrations/versions"/*.py ]; then
    echo "Creating initial database migration..."
    flask db migrate -m "Initial migration"
else
    echo "Migration already exists"
fi

# Apply database migrations
echo -e "\n${YELLOW}=== Applying Database Migrations ===${NC}"
flask db upgrade

# Verify database initialization
DB_FILE="/app/data/devbench.db"
if [ -f "$DB_FILE" ]; then
    echo -e "\n${GREEN}✓ Database initialized successfully!${NC}"
    echo -e "Database location: ${DB_FILE}"
    
    # Check if admin user exists
    if sqlite3 "$DB_FILE" "SELECT 1 FROM user WHERE username='admin';" 2>/dev/null | grep -q 1; then
        echo -e "${GREEN}✓ Admin user exists${NC}"
    else
        echo -e "${YELLOW}⚠ Admin user not found. Creating default admin user...${NC}"
        # This will be handled by the application's init_db() function
        python3 -c "from app import app, db; app.app_context().push(); from models import User; \
            admin = User(username='admin', is_admin=True); \
            admin.set_password('admin123'); \
            db.session.add(admin); \
            db.session.commit(); \
            print('✅ Admin user created with password: admin123')" || \
        echo -e "${RED}✗ Failed to create admin user${NC}"
    fi
else
    echo -e "${RED}✗ Database initialization failed!${NC}"
    echo "Check the logs above for errors."
    exit 1
fi

echo -e "\n${GREEN}=== Database Initialization Complete ===${NC}"
