#!/bin/bash

# Test provision_vm.sh script for Devbench Manager
# This is a mock script for development and testing purposes
# Replace this with your actual VM provisioning logic

set -e

# Function to log messages with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to simulate VM creation
create_vm() {
    local vm_name="$1"
    log "Creating VM: $vm_name"
    
    # Simulate provisioning time
    sleep 2
    
    # Generate a mock IP address
    local ip="192.168.1.$((RANDOM % 200 + 10))"
    
    # Create mock output
    cat << EOF
{
  "status": "success",
  "vm_name": "$vm_name",
  "ip": "$ip",
  "ssh_command": "ssh user@$ip",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "message": "VM created successfully"
}
EOF
    
    log "VM $vm_name created successfully with IP: $ip"
}

# Function to check VM status
check_status() {
    local vm_name="$1"
    log "Checking status for VM: $vm_name"
    
    # Simulate status check
    sleep 1
    
    # Randomly return active or not active for testing
    if [ $((RANDOM % 2)) -eq 0 ]; then
        echo "active"
        log "VM $vm_name is active"
    else
        echo "not active"
        log "VM $vm_name is not active"
    fi
}

# Function to activate VM
activate_vm() {
    local vm_name="$1"
    log "Activating VM: $vm_name"
    
    # Simulate activation time
    sleep 1
    
    echo "VM $vm_name activated successfully"
    log "VM $vm_name activated"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <command> <vm_name>"
    echo ""
    echo "Commands:"
    echo "  create <vm_name>    Create a new VM"
    echo "  status <vm_name>    Check VM status"
    echo "  activate <vm_name>  Activate VM"
    echo ""
    echo "Examples:"
    echo "  $0 create john+mydevbench"
    echo "  $0 status john+mydevbench"
    echo "  $0 activate john+mydevbench"
}

# Main script logic
main() {
    if [ $# -lt 2 ]; then
        log "ERROR: Insufficient arguments"
        show_usage
        exit 1
    fi
    
    local command="$1"
    local vm_name="$2"
    
    # Validate VM name format (should contain username+devbenchname)
    if [[ ! "$vm_name" =~ ^[a-zA-Z0-9_-]+\+[a-zA-Z0-9_-]+$ ]]; then
        log "ERROR: VM name must be in format 'username+devbenchname'"
        log "Received: $vm_name"
        exit 1
    fi
    
    case "$command" in
        "create")
            create_vm "$vm_name"
            ;;
        "status")
            check_status "$vm_name"
            ;;
        "activate")
            activate_vm "$vm_name"
            ;;
        *)
            log "ERROR: Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
