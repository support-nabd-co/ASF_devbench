#!/bin/bash

echo "Fixing DevBench Manager deployment issues..."
echo ""

# Step 1: Clean up existing containers and networks
echo "Step 1: Cleaning up existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true
docker rm -f devbench-manager 2>/dev/null || true
docker container prune -f

# Step 2: Create necessary directories
echo "Step 2: Creating directories..."
mkdir -p data logs
chmod 755 data logs

# Step 3: Ensure caddy network exists
echo "Step 3: Setting up networks..."
if ! docker network ls | grep -q caddy_network; then
    echo "Creating caddy_network..."
    docker network create caddy_network
else
    echo "caddy_network already exists"
fi

# Step 4: Build fresh image
echo "Step 4: Building fresh Docker image..."
docker-compose build --no-cache

# Step 5: Start the application
echo "Step 5: Starting DevBench Manager..."
docker-compose up -d

# Step 6: Wait and verify
echo "Step 6: Waiting for startup..."
sleep 20

# Check if container is running
if docker ps | grep -q devbench-manager; then
    echo ""
    echo "✅ SUCCESS! DevBench Manager is running"
    echo ""
    echo "Container Status:"
    docker ps | grep devbench-manager
    echo ""
    echo "Network Status:"
    docker inspect devbench-manager --format='{{range $k, $v := .NetworkSettings.Networks}}Network: {{$k}} {{end}}'
    echo ""
    echo "Health Check:"
    sleep 5
    if curl -s http://localhost:9090/health > /dev/null; then
        echo "✅ Health endpoint responding"
    else
        echo "⚠️  Health endpoint not responding yet (may need more time)"
    fi
    echo ""
    echo "Access Points:"
    echo "  Direct: http://localhost:9090"
    echo "  Via Caddy: https://tbm.nabd-co.com"
    echo ""
    echo "Default Login:"
    echo "  Username: admin"
    echo "  Password: admin123"
else
    echo ""
    echo "❌ FAILED! Container is not running"
    echo ""
    echo "Checking logs:"
    docker-compose logs --tail=20
    echo ""
    echo "Container status:"
    docker ps -a | grep devbench-manager
fi

echo ""
echo "Fix deployment script completed!"