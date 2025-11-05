#!/bin/bash

echo "Installing DevBench Manager..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "Node.js version: $(node -v) ✓"

# Install npm dependencies
echo "Installing npm dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully!"
    echo ""
    echo "Setup complete! You can now start the application with:"
    echo "  npm start"
    echo "  or"
    echo "  ./start.sh"
    echo ""
    echo "The application will be available at: http://localhost:3001"
    echo "Default admin login: admin / admin123"
else
    echo "✗ Failed to install dependencies"
    exit 1
fi