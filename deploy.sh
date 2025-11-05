#!/bin/bash

echo "Deploying DevBench Manager..."

# Create necessary directories
echo "Creating directories..."
mkdir -p data logs

# Create caddy network if it doesn't exist
if ! docker network ls | grep -q caddy_network; then
    echo "Creating caddy_network..."
    docker network create caddy_network
fi

# Clean up any existing containers
echo "Cleaning up existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true
docker rm -f devbench-manager 2>/dev/null || true

# Build and start the application
echo "Building and starting DevBench Manager..."
docker-compose up -d --build

# Wait for container to be ready
echo "Waiting for container to be ready..."
sleep 15

# Check if container is running
if docker ps | grep -q devbench-manager; then
    echo "✓ DevBench Manager deployed successfully!"
    echo ""
    echo "Container is running on port 9090"
    echo "Access via Caddy proxy at: https://tbm.nabd-co.com"
    echo "Direct access at: http://localhost:9090"
    echo ""
    echo "Default admin credentials:"
    echo "  Username: admin"
    echo "  Password: admin123"
    echo ""
    echo "Useful commands:"
    echo "  Check logs: docker-compose logs -f"
    echo "  Check health: curl http://localhost:9090/health"
    echo "  Stop: docker-compose down"
else
    echo "✗ Deployment failed!"
    echo "Check logs with: docker-compose logs"
    exit 1
fi