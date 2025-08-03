#!/bin/bash

# Safer Fix Docker Build Issues Script
# This script only affects Devbench Manager containers, not other services

set -e

echo "🔧 Fixing Docker build issues (safe mode)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Step 1: Clean up problematic lock files
print_status "Removing problematic package lock files..."
rm -f package-lock.json
rm -f frontend/package-lock.json
rm -f yarn.lock
rm -f frontend/yarn.lock
print_success "Lock files removed"

# Step 2: Clean only Devbench-related Docker resources (SAFE)
print_status "Cleaning Devbench-related Docker resources only..."

# Remove only devbench-related containers
docker rm -f devbench-manager || true

# Remove only devbench-related images
docker rmi -f $(docker images | grep devbench | awk '{print $3}') 2>/dev/null || true

# Clean build cache for this project only (safer than system-wide prune)
docker builder prune --filter "label=project=devbench" -f || true

print_success "Devbench Docker resources cleaned (other containers unaffected)"

# Step 3: Stop existing Devbench services
print_status "Stopping existing Devbench services..."
docker-compose down --remove-orphans || true
print_success "Devbench services stopped"

# Step 4: Build with no cache
print_status "Building Docker image with no cache..."
docker-compose build --no-cache

if [ $? -eq 0 ]; then
    print_success "Docker build completed successfully!"
    
    # Step 5: Start the services
    print_status "Starting Devbench services..."
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        print_success "🎉 Devbench Manager is now running!"
        echo ""
        echo "📋 Service Information:"
        echo "  • Container: devbench-manager"
        echo "  • Port: 8080"
        echo "  • Health: http://localhost:8080/api/health"
        echo ""
        echo "🔧 Next Steps:"
        echo "  1. Update your Caddyfile to point to devbench-manager:3001"
        echo "  2. Restart Caddy: docker restart caddy"
        echo "  3. Access your app: https://tbm.asf.nabd-co.com"
        echo ""
        
        # Show status of other containers to confirm they're unaffected
        print_status "Checking other containers are still running..."
        echo "Other running containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -v devbench-manager || echo "  (No other containers found)"
        
        # Check if container is healthy
        sleep 5
        if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
            print_success "✅ Application is healthy and responding!"
        else
            print_warning "⚠️  Application may still be starting up. Check logs with: docker-compose logs -f"
        fi
    else
        print_error "Failed to start services"
        exit 1
    fi
else
    print_error "Docker build failed"
    echo ""
    echo "🔍 Troubleshooting steps:"
    echo "  1. Check if you have enough disk space"
    echo "  2. Ensure Docker daemon is running"
    echo "  3. Check the error logs above for specific issues"
    exit 1
fi

print_success "✅ Build fix completed - other containers were not affected!"
