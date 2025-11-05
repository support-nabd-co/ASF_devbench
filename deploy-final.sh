#!/bin/bash

echo "🚀 Deploying DevBench Manager with all improvements..."

# Create directories
echo "📁 Creating directories..."
mkdir -p data logs public/css public/images

# Make scripts executable
echo "🔧 Setting permissions..."
chmod +x provision_vm.sh *.sh

# Clean up containers
echo "🧹 Cleaning up existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true
docker rm -f devbench-manager 2>/dev/null || true

# Create network
if ! docker network ls | grep -q caddy_network; then
    echo "🌐 Creating caddy_network..."
    docker network create caddy_network
else
    echo "✅ caddy_network already exists"
fi

# Build and deploy
echo "🏗️  Building and starting container..."
docker-compose up -d --build

# Wait for startup
echo "⏳ Waiting for container startup..."
sleep 15

# Check status
if docker ps | grep -q devbench-manager; then
    echo ""
    echo "🎉 SUCCESS! DevBench Manager is running with improvements:"
    echo ""
    echo "✅ Fixed status detection (now properly shows active/inactive)"
    echo "✅ Added activate command support to provision script"
    echo "✅ Improved SSH connection info format"
    echo "✅ Added NABD Solutions company logo"
    echo "✅ Enhanced UI with copy-to-clipboard functionality"
    echo ""
    echo "🌐 Access Points:"
    echo "   Direct: http://localhost:9090"
    echo "   Via Caddy: https://tbm.nabd-co.com"
    echo ""
    echo "🔐 Default Login:"
    echo "   Username: admin"
    echo "   Password: admin123"
    echo ""
    echo "🛠️  Useful Commands:"
    echo "   Check logs: docker-compose logs -f"
    echo "   Check health: curl http://localhost:9090/health"
    echo "   Stop: docker-compose down"
    
    # Test health endpoint
    echo ""
    echo "🏥 Health Check:"
    if curl -s http://localhost:9090/health > /dev/null; then
        echo "✅ Application is healthy"
    else
        echo "⚠️  Health check failed (may need more time)"
    fi
    
else
    echo ""
    echo "❌ DEPLOYMENT FAILED!"
    echo ""
    echo "📋 Checking logs:"
    docker-compose logs --tail=20
    echo ""
    echo "🔍 Container status:"
    docker ps -a | grep devbench-manager
    exit 1
fi

echo ""
echo "🎯 Deployment completed successfully!"