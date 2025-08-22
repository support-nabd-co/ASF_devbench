#!/bin/bash
set -e

# Enable debug output
set -x

# Log function
log() {
    echo \"[$(date '+%Y-%m-%d %H:%M:%S')] $1\"
}

# Ensure data directory exists with proper permissions
ensure_data_directory() {
    log \"Ensuring data directory exists...\"
    mkdir -p /app/data
    chown -R 1000:1000 /app/data
    chmod -R 755 /app/data
    
    # Test write access
    if touch /app/data/.write_test && rm -f /app/data/.write_test; then
        log \"✅ Data directory is writable\"
        return 0
    else
        log \"❌ Data directory is not writable\"
        return 1
    fi
}

# Initialize database and run migrations
init_database() {
    local max_attempts=10
    local attempt=0
    local wait_seconds=5
    
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        log \"Database initialization attempt $attempt of $max_attempts...\"
        
        # Enable SQLAlchemy debug logging
        export SQLALCHEMY_ECHO=1
        
        # Ensure migrations directory exists
        mkdir -p /app/migrations
        chown -R 1000:1000 /app/migrations
        chmod -R 755 /app/migrations
        
        # Check if migrations need to be initialized
        if [ ! -f \"/app/migrations/alembic.ini\" ]; then
            log \"Initializing database migrations...\"
            if ! flask db init; then
                log \"❌ Failed to initialize migrations\"
                sleep $wait_seconds
                continue
            fi
        fi
        
        # Create and apply migrations
        log \"Creating and applying migrations...\"
        if ! flask db migrate -m \"Initial migration\"; then
            log \"⚠️ Failed to create migration (this might be normal if no changes detected)\"
        fi
        
        if flask db upgrade; then
            log \"✅ Database initialized successfully\"
            return 0
        else
            log \"❌ Failed to apply migrations (attempt $attempt/$max_attempts)\"
            sleep $wait_seconds
        fi
    done
    
    log \"❌ Failed to initialize database after $max_attempts attempts\"
    return 1
}

# Create admin user if it doesn't exist
create_admin_user() {
    log \"Ensuring admin user exists...\"
    python3 -c \"
import os
import sys
from app import app, db, User

with app.app_context():
    try:
        print('Checking if admin user exists...')
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            print('Creating admin user...')
            admin = User(username='admin', is_admin=True)
            admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
            admin.set_password(admin_password)
            db.session.add(admin)
            db.session.commit()
            print('✅ Admin user created')
        else:
            print('ℹ️  Admin user already exists')
    except Exception as e:
        print(f'❌ Error creating admin user: {str(e)}')
        import traceback
        traceback.print_exc()
        sys.exit(1)
    \"
}

# Main execution
main() {
    log \"Starting ASF Devbench Manager...\"
    
    # Ensure data directory exists and is writable
    if ! ensure_data_directory; then
        log \"❌ Could not ensure data directory exists and is writable\"
        exit 1
    fi
    
    # Initialize database
    if ! init_database; then
        log \"❌ Database initialization failed\"
        exit 1
    fi
    
    # Create admin user
    create_admin_user
    
    log \"✅ Initialization complete\"
}

# Run the main function
main \"$@\"

# Start the Flask application
exec gunicorn --bind 0.0.0.0:3001 --timeout 120 --workers 4 --worker-class gthread --threads 4 app:app"
