#!/bin/bash

echo "Cleaning up DevBench Manager containers and volumes..."

# Stop and remove containers
echo "Stopping containers..."
docker-compose down --remove-orphans

# Remove any existing containers with the same name
echo "Removing existing containers..."
docker rm -f devbench-manager 2>/dev/null || true

# Remove dangling containers
echo "Removing dangling containers..."
docker container prune -f

# List and optionally remove volumes
echo "Current volumes:"
docker volume ls | grep devbench

echo ""
echo "Cleanup complete!"
echo "You can now run: docker-compose up -d --build"