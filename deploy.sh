#!/bin/bash

echo "Deploying DevBench Manager..."

# Create caddy network if it doesn't exist
if ! docker network ls | grep -q caddy_network; then
    echo "Creating caddy_network..."
    docker network create caddy_network
fi

# Stop existing container if running
if docker ps -a | grep -q devbench-manager; then
    echo "Stopping existing container..."
    docker-compose down
fi

# Build and start the application
echo "Building and starting DevBench Manager..."
docker-compose up -d --build

# Wait for container to be ready
echo "Waiting for container to be ready..."
sleep 10

# Check if container is running
if docker ps | grep -q devbench-manager; then
    echo "✓ DevBench Manager deployed successfully!"
    echo ""
    echo "Container is running on port 9090"
    echo "Access via Caddy proxy at: https://tbm.nabd-co.com"
    echo ""
    echo "Default admin credentials:"
    echo "  Username: admin"
    echo "  Password: admin123"
    echo ""
    echo "To check logs: docker-compose logs -f"
    echo "To stop: docker-compose down"
else
    echo "✗ Deployment failed!"
    echo "Check logs with: docker-compose logs"
    exit 1
fi