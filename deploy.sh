#!/bin/bash

# Devbench Manager Deployment Script
# This script deploys the Devbench Manager application to your cloud server

set -e  # Exit on any error

echo "🚀 Starting Devbench Manager deployment..."

# Configuration
DOMAIN="tbm.asf.nabd-co.com"
APP_NAME="devbench-manager"
COMPOSE_FILE="docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if .env file exists
check_env_file() {
    print_status "Checking environment configuration..."
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from .env.production template..."
        cp .env.production .env
        print_error "Please edit .env file with your actual configuration values before continuing!"
        print_error "Required: JWT_SECRET, FIREBASE_CONFIG, SSL_EMAIL"
        exit 1
    fi
    print_success "Environment file found"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    mkdir -p ssl/live/${DOMAIN}
    mkdir -p nginx/html
    mkdir -p logs
    print_success "Directories created"
}

# Build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Stop existing services
    print_status "Stopping existing services..."
    docker-compose down --remove-orphans || true
    
    # Build and start services
    print_status "Building Docker images..."
    docker-compose build --no-cache
    
    print_status "Starting services..."
    docker-compose up -d
    
    print_success "Services started successfully"
}

# Setup SSL certificates
setup_ssl() {
    print_status "Setting up SSL certificates..."
    
    # Check if certificates already exist
    if [ -f "ssl/live/${DOMAIN}/fullchain.pem" ]; then
        print_success "SSL certificates already exist"
        return
    fi
    
    print_status "Obtaining SSL certificates from Let's Encrypt..."
    
    # Create temporary nginx config without SSL
    print_status "Starting temporary HTTP server for certificate validation..."
    
    # Run certbot to get certificates
    docker-compose --profile ssl run --rm certbot
    
    if [ $? -eq 0 ]; then
        print_success "SSL certificates obtained successfully"
        
        # Restart nginx with SSL configuration
        print_status "Restarting nginx with SSL configuration..."
        docker-compose restart nginx
    else
        print_warning "Failed to obtain SSL certificates. Running in HTTP mode."
        print_warning "You can manually obtain certificates later using: docker-compose --profile ssl run --rm certbot"
    fi
}

# Check service health
check_health() {
    print_status "Checking service health..."
    
    # Wait for services to start
    sleep 10
    
    # Check if application is responding
    if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
        print_success "Application is healthy and responding"
    else
        print_error "Application health check failed"
        print_status "Checking container logs..."
        docker-compose logs devbench-app
        exit 1
    fi
    
    # Check if nginx is responding
    if curl -f http://localhost:8081 > /dev/null 2>&1; then
        print_success "Nginx is responding on port 8081"
    else
        print_warning "Nginx is not responding on port 8081"
    fi
}

# Display deployment information
show_deployment_info() {
    print_success "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Deployment Information:"
    echo "  • Application URL: https://${DOMAIN}:8443"
    echo "  • HTTP Access: http://${DOMAIN}:8081"
    echo "  • Direct App Access: http://localhost:8080"
    echo "  • API Health: http://localhost:8080/api/health"
    echo ""
    echo "🔧 Management Commands:"
    echo "  • View logs: docker-compose logs -f"
    echo "  • Restart: docker-compose restart"
    echo "  • Stop: docker-compose down"
    echo "  • Update: git pull && ./deploy.sh"
    echo ""
    echo "📁 Important Files:"
    echo "  • Environment: .env"
    echo "  • SSL Certificates: ssl/live/${DOMAIN}/"
    echo "  • Nginx Config: nginx/conf.d/devbench.conf"
    echo "  • Application Logs: docker-compose logs devbench-app"
    echo ""
    
    if [ ! -f "ssl/live/${DOMAIN}/fullchain.pem" ]; then
        print_warning "⚠️  SSL certificates not configured. Application is running in HTTP mode."
        echo "  To setup SSL: docker-compose --profile ssl run --rm certbot"
    fi
}

# Main deployment process
main() {
    echo "🌟 Devbench Manager Deployment Script"
    echo "======================================"
    
    check_docker
    check_env_file
    create_directories
    deploy_services
    
    # Only setup SSL if running on the actual domain
    if [[ $(hostname -f) == *"${DOMAIN}"* ]] || [[ "${1}" == "--ssl" ]]; then
        setup_ssl
    else
        print_warning "Skipping SSL setup (not running on production domain)"
        print_warning "Use --ssl flag to force SSL setup"
    fi
    
    check_health
    show_deployment_info
}

# Handle script arguments
case "${1}" in
    --help|-h)
        echo "Devbench Manager Deployment Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --ssl     Force SSL certificate setup"
        echo "  --help    Show this help message"
        echo ""
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
