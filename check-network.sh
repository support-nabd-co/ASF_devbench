#!/bin/bash

echo "Checking DevBench Manager network configuration..."
echo ""

# Check if caddy_network exists
if docker network ls | grep -q caddy_network; then
    echo "✓ caddy_network exists"
else
    echo "✗ caddy_network does not exist"
    echo "  Run: docker network create caddy_network"
fi

# Check if devbench-manager container exists
if docker ps -a | grep -q devbench-manager; then
    echo "✓ devbench-manager container exists"
    
    # Check if container is running
    if docker ps | grep -q devbench-manager; then
        echo "✓ devbench-manager container is running"
        
        # Check networks
        echo ""
        echo "Container networks:"
        docker inspect devbench-manager --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
        
        # Check if on caddy_network
        if docker inspect devbench-manager --format='{{.NetworkSettings.Networks.caddy_network}}' | grep -q "map"; then
            echo "✓ devbench-manager is on caddy_network"
        else
            echo "✗ devbench-manager is NOT on caddy_network"
            echo "  This may cause Caddy proxy issues"
        fi
        
        # Test health endpoint
        echo ""
        echo "Testing health endpoint..."
        if docker exec devbench-manager wget -q --spider http://localhost:3001/health; then
            echo "✓ Health endpoint responding"
        else
            echo "✗ Health endpoint not responding"
        fi
        
    else
        echo "✗ devbench-manager container is not running"
    fi
else
    echo "✗ devbench-manager container does not exist"
    echo "  Run: docker-compose up -d"
fi

echo ""
echo "Network troubleshooting complete!"