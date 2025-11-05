#!/bin/bash

echo "Starting DevBench Manager..."

# Check if Docker is available
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "Using Docker Compose..."
    docker-compose up -d
    echo "DevBench Manager started with Docker!"
    echo "Access it at: http://localhost:3001"
    echo "Default admin login: admin / admin123"
else
    echo "Docker not found, starting with Node.js..."
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        echo "Error: Node.js is not installed!"
        echo "Please install Node.js 18+ or Docker to run this application."
        exit 1
    fi
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Start the application
    echo "Starting application..."
    npm start
fi