#!/bin/bash

echo "🎨 Updating UI with password info and dark blue theme..."

# Rebuild and restart the container
echo "🏗️  Rebuilding container with UI updates..."
docker-compose down
docker-compose up -d --build

# Wait for startup
echo "⏳ Waiting for container startup..."
sleep 10

# Check if running
if docker ps | grep -q devbench-manager; then
    echo ""
    echo "✅ UI Updated Successfully!"
    echo ""
    echo "🎨 Changes Applied:"
    echo "   ✅ Password 'ASF' now shown for SSH and VNC connections"
    echo "   ✅ Dark blue theme applied (#1a365d)"
    echo "   ✅ Enhanced password info styling with icons"
    echo "   ✅ Improved visual hierarchy for connection info"
    echo ""
    echo "🔐 Connection Info Now Shows:"
    echo "   📡 SSH: ssh -t asf@asf-tb.duckdns.org \"ssh asf_user@<IP>\""
    echo "   🔑 Password: ASF"
    echo "   🖥️  VNC: connect to host at port 5901"
    echo "   🔑 Password: ASF"
    echo ""
    echo "🌐 Access: http://localhost:9090"
    echo "🎯 Via Caddy: https://tbm.nabd-co.com"
else
    echo "❌ Container failed to start"
    docker-compose logs --tail=10
fi

echo ""
echo "🎨 UI update completed!"