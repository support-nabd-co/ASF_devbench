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
    
    # Set proper permissions for data directory
    # This ensures the Docker container can write to it
    chmod 755 data
    print_success "Set proper permissions for data directory"
    
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
DATABASE_URL=sqlite:///data/devbench.db
ADMIN_PASSWORD=admin123
DOMAIN=tbm.asf.nabd-co.com
EOF
            print_success "Created basic .env file"
        fi
    else
        print_warning ".env already exists, skipping template copy"
    fi
    
    # Make provision script executable
    if [ -f "provision_vm.sh" ]; then
        chmod +x provision_vm.sh
        print_success "Made provision_vm.sh executable"
    else
        print_warning "provision_vm.sh not found"
    fi
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
    
    print_status "Building Docker images..."
    if command_exists docker-compose; then
        docker-compose build --no-cache
    else
        docker compose build --no-cache
    fi
    print_success "Docker images built successfully"
    
    print_status "Starting containers..."
    if command_exists docker-compose; then
        docker-compose up -d
    else
        docker compose up -d
    fi
    print_success "Containers started successfully"
    
    # Wait for container to be ready
    print_status "Waiting for application to be ready..."
    local max_attempts=60  # Increased timeout for database initialization
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:8082/api/health >/dev/null 2>&1; then
            print_success "Application is ready!"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "Application failed to start within expected time"
            print_status "Checking container logs..."
            docker logs devbench-manager --tail 50
            exit 1
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
}

# Function to display final status
display_final_status() {
    print_step 8 "Migration Complete!"
    
    echo ""
    echo "🎉 ASF Devbench Manager has been successfully migrated to Flask!"
    echo ""
    echo "📊 Migration Summary:"
    echo "  ✅ Migrated from Node.js/Firebase to Flask/SQLite"
    echo "  ✅ Updated Docker configuration"
    echo "  ✅ Built and deployed containers"
    echo "  ✅ Application is running and healthy"
    echo ""
    echo "🌐 Access Information:"
    echo "  • Local URL: http://localhost:8082"
    echo "  • Production URL: https://tbm.asf.nabd-co.com (if Caddy is configured)"
    echo "  • Health Check: http://localhost:8082/api/health"
    echo ""
    echo "👤 Default Admin Login:"
    echo "  • Username: admin"
    echo "  • Password: admin123 (change this in production!)"
    echo ""
    echo "🔧 Management Commands:"
    echo "  • View logs: docker logs devbench-manager"
    echo "  • Restart: docker-compose restart"
    echo "  • Stop: docker-compose down"
    echo "  • Update: git pull && ./fix-build-safe.sh"
    echo ""
    echo "📁 Important Files:"
    echo "  • Database: ./data/devbench.db"
    echo "  • Config: ./.env"
    echo "  • Backups: ./nodejs_backup_*/"
    echo ""
    
    # Show container status
    print_status "Container Status:"
    if command_exists docker-compose; then
        docker-compose ps
    else
        docker compose ps
    fi
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
