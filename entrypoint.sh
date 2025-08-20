#!/bin/bash
set -e

# Enable debug output
set -x

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Ensure data directory exists with proper permissions
ensure_data_directory() {
    log "Ensuring data directory exists..."
    if [ "$DATABASE_URL" = "sqlite:///data/devbench.db" ] || [ -z "$DATABASE_URL" ]; then
        mkdir -p /app/data
        chown -R 1000:1000 /app/data
        chmod -R 755 /app/data
        
        # Test write access
        if touch /app/data/.write_test && rm -f /app/data/.write_test; then
            log "✅ Data directory is writable"
        else
            log "❌ Data directory is not writable"
            return 1
        fi
    fi
}

# Initialize database and run migrations
init_database() {
    log "Initializing database..."
    
    # Enable SQLAlchemy debug logging
    export SQLALCHEMY_ECHO=1
    
    # Ensure migrations directory exists
    mkdir -p /app/migrations
    chown -R 1000:1000 /app/migrations
    chmod -R 755 /app/migrations
    
    # Check if database exists
    if [ ! -f "/app/data/devbench.db" ]; then
        log "Database does not exist, initializing..."
        
        # Initialize migrations
        log "Running: flask db init"
        if ! flask db init; then
            log "❌ Failed to initialize migrations"
            return 1
        fi
        
        # Create initial migration
        log "Running: flask db migrate -m 'Initial migration'"
        if ! flask db migrate -m "Initial migration"; then
            log "❌ Failed to create initial migration"
            return 1
        fi
        
        # Apply migrations
        log "Running: flask db upgrade"
        if ! flask db upgrade; then
            log "❌ Failed to apply migrations"
            return 1
        fi
        
        # Create admin user
        log "Creating admin user..."
        python3 -c "
import os
import sys
from app import app, db, User

with app.app_context():
    try:
        print('Checking if admin user exists...')
        if not User.query.filter_by(username='admin').first():
            print('Creating admin user...')
            admin = User(username='admin', is_admin=True)
            admin.set_password(os.environ.get('ADMIN_PASSWORD', 'admin123'))
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
        "
    else
        log "Database exists, running migrations..."
        log "Running: flask db upgrade"
        if ! flask db upgrade; then
            log "❌ Failed to run migrations"
            return 1
        fi
    fi
    
    # Ensure proper permissions
    chown -R 1000:1000 /app/data /app/migrations
    return 0
}

# Main execution
main() {
    log "Starting ASF Devbench Manager..."
    
    # Change to app directory
    cd /app
    
    # Set environment variables
    export FLASK_APP=app.py
    export FLASK_ENV=production
    
    # Ensure data directory is ready
    if ! ensure_data_directory; then
        log "❌ Failed to ensure data directory"
        exit 1
    fi
    
    # Initialize and migrate database
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log "Database initialization attempt $attempt of $max_attempts..."
        if init_database; then
            log "✅ Database initialized successfully"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log "❌ Failed to initialize database after $max_attempts attempts"
            exit 1
        fi
        
        sleep 5
        attempt=$((attempt + 1))
    done
    
    # Start the application
    log "Starting application..."
    exec "$@"
}

# Run the main function
main "$@"
