#!/bin/bash

echo "Testing provision script execution..."

# Check if script exists
if [ -f "./provision_vm.sh" ]; then
    echo "✓ provision_vm.sh found"
    
    # Check if executable
    if [ -x "./provision_vm.sh" ]; then
        echo "✓ provision_vm.sh is executable"
    else
        echo "✗ provision_vm.sh is not executable"
        echo "Making it executable..."
        chmod +x ./provision_vm.sh
    fi
    
    # Test script with status command (should be quick)
    echo ""
    echo "Testing script with status command..."
    echo "Command: ./provision_vm.sh status test_vm"
    echo "Output:"
    timeout 10s ./provision_vm.sh status test_vm 2>&1 || echo "Script timed out or failed"
    
else
    echo "✗ provision_vm.sh not found in current directory"
    echo "Current directory: $(pwd)"
    echo "Files in directory:"
    ls -la
fi

echo ""
echo "Testing from container perspective..."
echo "Checking if script is accessible from /app directory..."

if [ -f "/app/provision_vm.sh" ]; then
    echo "✓ Script found at /app/provision_vm.sh"
    ls -la /app/provision_vm.sh
else
    echo "✗ Script not found at /app/provision_vm.sh"
fi