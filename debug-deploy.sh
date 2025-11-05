#!/bin/bash

echo "Debug deployment for DevBench Manager..."

# Create directories
mkdir -p data logs

# Make scripts executable
chmod +x provision_vm.sh test-script.sh

# Test the provision script first
echo "Testing provision script..."
./test-script.sh

# Clean up containers
echo "Cleaning up containers..."
docker-compose down --remove-orphans 2>/dev/null || true
docker rm -f devbench-manager 2>/dev/null || true

# Create network
if ! docker network ls | grep -q caddy_network; then
    echo "Creating caddy_network..."
    docker network create caddy_network
fi

# Build with debug output
echo "Building container..."
docker-compose build --no-cache

# Start container
echo "Starting container..."
docker-compose up -d

# Wait for startup
echo "Waiting for container startup..."
sleep 10

# Check container status
echo "Container status:"
docker ps | grep devbench-manager

# Check logs
echo "Container logs:"
docker-compose logs --tail=20

# Test health endpoint
echo "Testing health endpoint..."
curl -s http://localhost:9090/health | jq . 2>/dev/null || curl -s http://localhost:9090/health

# Test script inside container
echo "Testing script inside container..."
docker exec devbench-manager ls -la /app/provision_vm.sh 2>/dev/null || echo "Could not access script in container"

echo ""
echo "Debug deployment complete!"
echo "Access the application at: http://localhost:9090"