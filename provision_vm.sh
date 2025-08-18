#!/bin/bash

# Set up logging
LOG_DIR="/var/log/devbench"
LOG_FILE="$LOG_DIR/provision_vm_$(date +%Y%m%d_%H%M%S).log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"
chmod 777 "$LOG_DIR"

# Function to log messages
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

log "Starting provision_vm.sh with arguments: $*"

# Check if enough arguments were provided for the remote script.
# The remote 'provision_vm.sh' script expects at least 2 arguments: <command> <vm_name>.
if [ "$#" -lt 2 ]; then
    error_msg="Error: Please provide at least two arguments for the remote command."
    log "$error_msg"
    echo "Usage: $0 <command> <vm_name>"
    echo "Example: $0 create john+mydevbench"
    echo "         $0 status john+mydevbench"
    exit 1
fi

# SSH connection details
SSH_USER="asf"
SSH_HOST="asf-tb.duckdns.org"
SSH_PASS="ASF"

# The path to the script on the remote server
REMOTE_SCRIPT_PATH="./provision_vm.sh"

# Construct the full command to be executed on the remote server
REMOTE_COMMAND_ARGS="$@"

log "Connecting to $SSH_HOST and running: $REMOTE_SCRIPT_PATH $REMOTE_COMMAND_ARGS"

# Create a temporary file to capture output
TEMP_OUTPUT=$(mktemp)

# Function to clean up temp file
cleanup() {
    rm -f "$TEMP_OUTPUT"
    log "Temporary files cleaned up"
}
trap cleanup EXIT

# Execute the remote command and capture output
log "Executing remote command..."
if ! sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" "$REMOTE_SCRIPT_PATH" "$@" 2>&1 | tee "$TEMP_OUTPUT"; then
    error_msg="Failed to execute remote command"
    log "ERROR: $error_msg"
    exit 1
fi

# Log the full output
log "Remote command output:"
cat "$TEMP_OUTPUT" >> "$LOG_FILE"

# Check if the command was successful
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log "Remote command executed successfully"
else
    error_msg="Remote command failed with status ${PIPESTATUS[0]}"
    log "ERROR: $error_msg"
    exit ${PIPESTATUS[0]}
fi

log "Provisioning script completed"