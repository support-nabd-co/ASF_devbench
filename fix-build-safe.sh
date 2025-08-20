#!/bin/bash

# ASF Devbench Manager - Flask Migration & Docker Build Script
# Automates migration from Node.js/Firebase to Flask/SQLite and deploys via Docker

set -e

echo "🚀 ASF Devbench Manager - Flask Migration & Docker Build"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "\n${PURPLE}[STEP $1]${NC} $2"
    echo "----------------------------------------"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_step 1 "Checking Prerequisites"
    
    local missing_deps=()
    
    # Check Docker
    if ! command_exists docker; then
        missing_deps+=("docker")
    else
        print_success "Docker found: $(docker --version | head -n1)"
    fi
    
    # Check Docker Compose
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        missing_deps+=("docker-compose")
    else
        if command_exists docker-compose; then
            print_success "Docker Compose found: $(docker-compose --version)"
        else
            print_success "Docker Compose found: $(docker compose version)"
        fi
    fi
    
    # Check Python (for local testing if needed)
    if command_exists python3; then
        print_success "Python3 found: $(python3 --version)"
    elif command_exists python; then
        print_success "Python found: $(python --version)"
    else
        print_warning "Python not found (optional - only needed for local development)"
    fi
    
    # Check Node.js (for frontend build)
    if ! command_exists node; then
        missing_deps+=("node")
    else
        print_success "Node.js found: $(node --version)"
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        print_error "Please install the missing dependencies and try again."
        exit 1
    fi
    
    print_success "All prerequisites satisfied!"
}

# Function to backup existing files
backup_old_files() {
    print_step 2 "Backing Up Existing Files"
    
    local backup_dir="nodejs_backup_$(date +%Y%m%d_%H%M%S)"
    local files_to_backup=("server.js" "package.json" ".env.production")
    
    if [ ! -d "$backup_dir" ]; then
        mkdir -p "$backup_dir"
        print_success "Created backup directory: $backup_dir"
    fi
    
    for file in "${files_to_backup[@]}"; do
        if [ -f "$file" ]; then
            cp "$file" "$backup_dir/"
            print_success "Backed up $file to $backup_dir/"
        fi
    done
    
    # Backup current .env if it exists
    if [ -f ".env" ]; then
        cp ".env" "$backup_dir/.env.original"
        print_success "Backed up current .env to $backup_dir/.env.original"
    fi
}

# Function to setup Flask environment
setup_flask_environment() {
    print_step 3 "Setting Up Flask Environment"
    
    # Create data directory for SQLite database with proper permissions
    if [ ! -d "data" ]; then
        mkdir -p data
        print_success "Created data directory for SQLite database"
    fi
    
    # Ensure logs directory exists with proper permissions
    if [ ! -d "logs" ]; then
        mkdir -p logs
        chmod 755 logs
        print_success "Created logs directory"
    fi
    
    # Set proper permissions for data and logs directories
    # This ensures the Docker container can write to them
    chmod 755 data logs
    
    # On Windows/WSL, we need to ensure the directories are writable
    # Create test files to verify write permissions
    for dir in data logs; do
        if touch "$dir/.test_write" 2>/dev/null; then
            rm -f "$dir/.test_write"
            print_success "$dir directory has proper write permissions"
        else
            print_warning "$dir directory may have permission issues, attempting to fix..."
            # Try to fix permissions on Windows/WSL
            if command_exists wsl; then
                # We're likely in WSL, use Linux permissions
                sudo chown -R $(id -u):$(id -g) "$dir" 2>/dev/null || true
                chmod 777 "$dir"  # More permissive for Docker volume
            else
                # On native Windows, try to make it writable
                chmod 777 "$dir"
            fi
            
            # Test again
            if touch "$dir/.test_write" 2>/dev/null; then
                rm -f "$dir/.test_write"
                print_success "Fixed $dir directory permissions"
            else
                print_error "Unable to fix $dir directory permissions"
                print_error "Please run: chmod 777 $dir"
                exit 1
            fi
        fi
    done
    
    # Copy Flask environment template if .env doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.flask" ]; then
            cp ".env.flask" ".env"
            print_success "Created .env from .env.flask template"
        else
            print_warning ".env.flask template not found, creating basic .env"
            cat > .env << EOF
# Flask Environment Configuration
FLASK_ENV=production
SECRET_KEY=change-this-in-production-$(openssl rand -hex 32 2>/dev/null || echo "fallback-secret-key")
PORT=3001
DATABASE_URL=sqlite:////app/data/devbench.db
ADMIN_PASSWORD=admin123
DOMAIN=tbm.asf.nabd-co.com
LOGS_DIR=/app/logs
# Set to 'disabled' to skip Firestore
FIREBASE_CREDENTIALS=disabled
EOF
            print_success "Created basic .env file"
        fi
    else
        # Update existing .env with required variables if they don't exist
        if ! grep -q "^LOGS_DIR=" .env 2>/dev/null; then
            echo "LOGS_DIR=/app/logs" >> .env
        fi
        if ! grep -q "^FIREBASE_CREDENTIALS=" .env 2>/dev/null; then
            echo "FIREBASE_CREDENTIALS=disabled" >> .env
        fi
        print_warning ".env already exists, checking for required variables..."
    fi
    
    # Check for default admin password
    if grep -q "ADMIN_PASSWORD=admin123" .env 2>/dev/null; then
        print_warning "⚠️  WARNING: Using default admin password!"
        print_warning "Please change the ADMIN_PASSWORD in your .env file"
    fi
    
    # Make provision script executable
    if [ -f "provision_vm.sh" ]; then
        chmod +x provision_vm.sh
        print_success "Made provision_vm.sh executable"
    else
        print_warning "provision_vm.sh not found"
    fi
    
    # Verify required environment variables
    local required_vars=("SECRET_KEY" "ADMIN_PASSWORD" "DOMAIN")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" .env 2>/dev/null; then
            print_warning "Missing required environment variable: $var"
            if [ "$var" = "SECRET_KEY" ] && ! grep -q "^SECRET_KEY=" .env 2>/dev/null; then
                # Generate a secure secret key
                NEW_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "fallback-secret-key-$(date +%s)")
                echo "SECRET_KEY=$NEW_SECRET" >> .env
                print_success "Generated new SECRET_KEY"
            elif [ "$var" = "ADMIN_PASSWORD" ] && ! grep -q "^ADMIN_PASSWORD=" .env 2>/dev/null; then
                # Generate a random admin password
                NEW_PASS=$(openssl rand -base64 16 2>/dev/null || echo "admin-$(date +%s)")
                echo "ADMIN_PASSWORD=$NEW_PASS" >> .env
                print_success "Generated new ADMIN_PASSWORD: $NEW_PASS"
                print_warning "⚠️  IMPORTANT: Save this admin password in a secure place!"
            else
                print_error "Please set the $var in your .env file"
                exit 1
            fi
        fi
    done
}

# Function to clean npm and prepare frontend
prepare_frontend() {
    print_step 4 "Preparing Frontend for Docker Build"
    
    # Clean problematic lock files that can cause Docker build issues
    print_status "Cleaning npm lock files..."
    rm -f package-lock.json
    rm -f frontend/package-lock.json
    rm -f yarn.lock
    rm -f frontend/yarn.lock
    print_success "Lock files removed"
    
    # Verify frontend directory and package.json exist
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found"
        exit 1
    fi
    
    if [ ! -f "frontend/package.json" ]; then
        print_error "frontend/package.json not found"
        exit 1
    fi
    
    print_success "Frontend preparation completed"
}

# Function to clean Docker resources
clean_docker_resources() {
    print_step 5 "Cleaning Docker Resources"
    
    print_status "Stopping existing devbench containers..."
    docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true
    
    print_status "Removing devbench-related containers..."
    docker rm -f devbench-manager 2>/dev/null || true
    
    print_status "Removing devbench-related images..."
    docker images | grep -E "(devbench|asf.*devbench)" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
    
    print_status "Cleaning build cache..."
    docker builder prune -f --filter "label=project=devbench" 2>/dev/null || true
    
    print_success "Docker cleanup completed"
}

# Function to verify required files
verify_required_files() {
    print_step 6 "Verifying Required Files"
    
    local required_files=("app.py" "requirements.txt" "Dockerfile" "docker-compose.yml")
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        else
            print_success "Found: $file"
        fi
    done
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        print_error "Missing required files: ${missing_files[*]}"
        print_error "Please ensure all Flask migration files are present."
        exit 1
    fi
    
    # Check if frontend directory exists
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found"
        exit 1
    else
        print_success "Found: frontend directory"
    fi
    
    print_success "All required files verified!"
}

# Function to build and start Docker containers
build_and_start_containers() {
    print_step 7 "Building and Starting Docker Containers"
    
    # Load environment variables from .env file if it exists
    # This function properly handles multi-line and special characters in .env files
    load_env_file() {
        local env_file="$1"
        local tmp_file
        tmp_file=$(mktemp)
        
        # Process the .env file line by line
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip comments and empty lines
            [[ $line =~ ^#.*$ || -z "$line" ]] && continue
            
            # Handle multi-line values (lines ending with \, but not \\ which would be an escaped backslash)
            if [[ $line == *'\\' ]]; then
                # Remove the trailing backslash and read the next line
                line="${line%\\}"
                while IFS= read -r next_line || [ -n "$next_line" ]; do
                    # Check if this line ends the multi-line value
                    if [[ $next_line != *'\\' ]]; then
                        line="$line$next_line"
                        break
                    else
                        # Remove the trailing backslash and continue reading
                        line="$line${next_line%\\}"
                    fi
                done
            fi
            
            # Export the variable
            echo "$line"
            
            # Handle the export safely
            if [[ $line =~ ^([^=]+)=(.*)$ ]]; then
                local var_name="${BASH_REMATCH[1]}"
                local var_value="${BASH_REMATCH[2]}"
                
                # Remove any surrounding quotes and braces
                var_value=${var_value%"}"}
                var_value=${var_value#"{"}
                var_value=${var_value%"'"}
                var_value=${var_value#"'"}
                var_value=${var_value%'"'}
                var_value=${var_value#'"'}
                
                # Export the variable
                export "$var_name"="$var_value"
            fi
        done < "$env_file" > "$tmp_file"
        
        # Source the processed file to set the variables
        # shellcheck source=/dev/null
        source "$tmp_file"
        rm -f "$tmp_file"
    }
    
    # Load the .env file if it exists
    if [ -f ".env" ]; then
        print_status "Loading environment variables from .env file..."
        if ! load_env_file ".env"; then
            print_error "Failed to load .env file"
            exit 1
        fi
    fi
    
    # Ensure database directory exists and has proper permissions
    mkdir -p data
    chmod 755 data
    
    print_status "Building Docker images..."
    if command_exists docker-compose; then
        docker-compose build --no-cache --build-arg BUILDKIT_INLINE_CACHE=1
    else
        docker compose build --no-cache --build-arg BUILDKIT_INLINE_CACHE=1
    fi
    
    if [ $? -ne 0 ]; then
        print_error "Failed to build Docker images"
        exit 1
    fi
    print_success "Docker images built successfully"
    
    print_status "Starting containers..."
    if command_exists docker-compose; then
        docker-compose up -d
    else
        docker compose up -d
    fi
    
    if [ $? -ne 0 ]; then
        print_error "Failed to start containers"
        docker logs devbench-manager --tail 50 2>/dev/null || true
        exit 1
    fi
    print_success "Containers started successfully"
    
    # Initialize database
    initialize_database
    
    # Wait for container to be ready
    print_status "Waiting for application to be ready (max 2 minutes)..."
    local max_attempts=60
    local attempt=1
    local container_ready=false
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:8082/api/health >/dev/null 2>&1; then
            print_success "Application is responding to health checks"
            container_ready=true
            break
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    if [ "$container_ready" != true ]; then
        print_error "Application failed to start within expected time"
        print_status "Container logs:"
        docker logs devbench-manager --tail 50 2>/dev/null || true
        exit 1
    fi
    
    # Initialize database and create admin user
    print_status "Initializing database and creating admin user..."
    
    # Get admin password from environment or use default
    # Ensure we're using the correct password from environment or .env file
    local admin_password="${ADMIN_PASSWORD:-admin123}"
    
    # If we're in a container, try to get the password from the environment
    if [ -z "$admin_password" ] || [ "$admin_password" = "admin123" ]; then
        local container_pass=$(docker exec devbench-manager printenv ADMIN_PASSWORD 2>/dev/null || echo "")
        if [ -n "$container_pass" ]; then
            admin_password="$container_pass"
        fi
    fi
    
    # Run database initialization script
    if ! docker exec -e ADMIN_PASSWORD="$admin_password" devbench-manager python -c '
import os
import sys
from app import app, db, User, init_db

# Initialize the database
print("🔄 Initializing database...")
init_db()
print("✅ Database initialized")

# Verify admin user
with app.app_context():
    admin = User.query.filter_by(username="admin").first()
    if admin and admin.check_password(os.environ.get("ADMIN_PASSWORD", "")):
        print("✅ Admin user verified")
    else:
        print("❌ Admin user verification failed")
        sys.exit(1)
' 2>&1; then
        print_error "Failed to initialize database"
        docker logs devbench-manager --tail 50 2>/dev/null || true
        exit 1
    fi
    
    # Test login with the admin credentials
    print_status "Testing login with admin credentials..."
    if ! docker exec devbench-manager curl -s -f -X POST http://localhost:3001/api/login \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"admin\",\"password\":\"$admin_password\"}" \
        >/dev/null 2>&1; then
        print_warning "⚠️  Admin login test failed. Please check your credentials."
    else
        print_success "✅ Admin login successful"
    fi
    
    # Set up log rotation
    print_status "Setting up log rotation..."
    if [ ! -f "/etc/logrotate.d/devbench" ]; then
        sudo bash -c 'cat > /etc/logrotate.d/devbench << EOL
$(pwd)/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        docker restart devbench-manager > /dev/null 2>&1 || true
    endscript
}
EOL'
        if [ $? -eq 0 ]; then
            print_success "✅ Log rotation configured"
        else
            print_warning "⚠️  Failed to set up log rotation (requires sudo)"
        fi
    else
        print_success "✅ Log rotation already configured"
    fi
    
    # Final status check
    print_status "Performing final health check..."
    if curl -f http://localhost:8082/api/health >/dev/null 2>&1; then
        print_success "✅ Application is fully operational"
    else
        print_warning "⚠️  Application is running but health check failed"
    fi
}

# Function to initialize database
initialize_database() {
    print_status "Initializing database..."
    local max_retries=10
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if docker exec -i devbench-manager /bin/sh -c "flask db upgrade" 2>/dev/null; then
            print_success "Database initialized successfully"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        print_warning "Database initialization attempt $retry_count failed, retrying in 5 seconds..."
        sleep 5
    done
    
    print_error "Failed to initialize database after $max_retries attempts"
    docker logs devbench-manager --tail 50 2>/dev/null || true
    exit 1
}

# Function to display final status
display_final_status() {
    print_step 8 "Deployment Complete!"
    
    # Get current environment information
    local env_file=".env"
    local db_path="$(pwd)/data/devbench.db"
    local logs_path="$(pwd)/logs"
    local admin_user="admin"
    local admin_password=$(grep "^ADMIN_PASSWORD=" "$env_file" 2>/dev/null | cut -d= -f2- || echo "[Not found in .env]")
    local domain=$(grep "^DOMAIN=" "$env_file" 2>/dev/null | cut -d= -f2- || echo "tbm.asf.nabd-co.com")
    
    # Check if running in production mode
    local is_production=false
    if grep -q "^FLASK_ENV=production" "$env_file" 2>/dev/null; then
        is_production=true
    fi
    
    # Get container status
    local container_status
    if command_exists docker-compose; then
        container_status=$(docker-compose ps 2>&1 || echo "Error getting container status")
    else
        container_status=$(docker compose ps 2>&1 || echo "Error getting container status")
    fi
    
    # Get database size
    local db_size="N/A"
    if [ -f "$db_path" ]; then
        db_size=$(du -h "$db_path" | cut -f1)
    fi
    
    # Get log files info
    local log_files=""
    if [ -d "$logs_path" ]; then
        log_files=$(find "$logs_path" -type f -name "*.log" -exec ls -lh {} \; 2>/dev/null | awk '{print $5 "\t" $9}' || echo "No log files found")
    fi
    
    # Display deployment summary
    echo ""
    echo "┌──────────────────────────────────────────────────────────────┐"
    echo "│ 🚀 ASF Devbench Manager Deployment Summary                   │"
    echo "├──────────────────────────────────────────────────────────────┤"
    echo "│ 🌐 Access Information:                                      │"
    echo "│   • Local URL:      http://localhost:8082                   │"
    echo "│   • Production URL: https://$domain                        │"
    echo "│   • Health Check:   http://localhost:8082/api/health        │"
    echo "│   • Admin Panel:    http://localhost:8082/admin             │"
    echo "│                                                              │"
    echo "│ 🔐 Admin Credentials:                                       │"
    echo "│   • Username:       $admin_user                            │"
    if [ "$is_production" = true ] && [ "$admin_password" != "[Not found in .env]" ]; then
        echo "│   • Password:       [hidden] (check .env file)              │"
    else
        echo "│   • Password:       $admin_password" | awk '{printf "%-60s\n", $0}' | sed 's/^│   \• /│   • /'
    fi
    echo "│                                                              │"
    echo "📊 System Information:                                         │"
    echo "│   • Database:       $db_path ($db_size)                     │"
    echo "│   • Logs:           $logs_path                             │"
    echo "│   • Environment:    $( [ "$is_production" = true ] && echo "Production 🔒" || echo "Development 🛠️ " )"
    echo "└──────────────────────────────────────────────────────────────┘"
    echo ""
    
    # Display container status
    echo "📦 Container Status:"
    echo "$container_status" | awk '{print "  " $0}'
    echo ""
    
    # Display log files information
    if [ -n "$log_files" ]; then
        echo "📋 Log Files:"
        echo "$log_files" | while read -r line; do
            echo "  • $line"
        done
        echo ""
    fi
    
    # Display management commands
    echo "🔧 Management Commands:"
    echo "  • View logs:        docker logs -f devbench-manager"
    echo "  • View DB shell:    docker exec -it devbench-manager flask shell"
    echo "  • Restart:          docker-compose restart"
    echo "  • Stop:             docker-compose down"
    echo "  • Update:           git pull && ./fix-build-safe.sh"
    echo "  • Backup DB:        cp data/devbench.db data/backup_\$(date +%Y%m%d_%H%M%S).db"
    echo ""
    
    # Display important notes for production
    if [ "$is_production" = true ]; then
        echo "🔐 Production Security Notes:"
        echo "  • Change the default admin password immediately"
        echo "  • Ensure your .env file has proper permissions (chmod 600 .env)"
        echo "  • Regularly backup your database from ./data/ directory"
        echo "  • Monitor logs in $logs_path"
        echo ""
    fi
    
    # Final success message
    echo "✅ Deployment completed successfully!"
    echo "   You can now access the application at http://localhost:8082"
    echo ""
}

# Function to handle errors
handle_error() {
    print_error "Script failed at line $1"
    print_status "Checking container logs for debugging..."
    docker logs devbench-manager --tail 20 2>/dev/null || true
    exit 1
}

# Set error trap
trap 'handle_error $LINENO' ERR

# Main execution
main() {
    echo "Starting Flask migration and Docker deployment..."
    echo ""
    
    # Ask for confirmation
    read -p "This will migrate your application from Node.js/Firebase to Flask/SQLite. Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Migration cancelled by user"
        exit 0
    fi
    
    # Execute migration steps
    check_prerequisites
    backup_old_files
    setup_flask_environment
    prepare_frontend
    clean_docker_resources
    verify_required_files
    build_and_start_containers
    display_final_status
    
    print_success "Flask migration and Docker deployment completed successfully!"
}

# Run main function
main "$@"
