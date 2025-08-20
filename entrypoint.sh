#!/bin/bash
set -e

# Ensure data directory exists with proper permissions
ensure_data_directory() {
    if [ "$DATABASE_URL" = "sqlite:///data/devbench.db" ] || [ -z "$DATABASE_URL" ]; then
        mkdir -p /app/data
        chown -R 1000:1000 /app/data
        chmod -R 755 /app/data
        
        # Test write access
        touch /app/data/.write_test && rm -f /app/data/.write_test
    fi
}

# Initialize database and run migrations
init_database() {
    # Ensure migrations directory exists
    mkdir -p /app/migrations
    chown -R 1000:1000 /app/migrations
    
    # Initialize database if it doesn't exist
    if [ ! -f "/app/data/devbench.db" ]; then
        echo "Initializing database..."
        flask db init
        flask db migrate -m "Initial migration"
        flask db upgrade
        
        # Create admin user if not exists
        python3 -c "
from app import app, db, User
with app.app_context():
    if not User.query.filter_by(username='admin').first():
        admin = User(username='admin', is_admin=True)
        admin.set_password('${ADMIN_PASSWORD:-admin123}')
        db.session.add(admin)
        db.session.commit()
        print('✅ Admin user created')"
    else
        echo "Database already exists, running migrations..."
        flask db upgrade
    fi
    
    chown -R 1000:1000 /app/data
}

# Main execution
main() {
    echo "Starting ASF Devbench Manager..."
    
    # Ensure data directory is ready
    ensure_data_directory
    
    # Initialize and migrate database
    cd /app
    init_database
    
    # Start the application
    exec "$@"
}

# Run the main function
main "$@"
