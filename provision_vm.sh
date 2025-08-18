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
    echo "Example: $0 create username_vmname"
    echo "         $0 status username_vmname"
    exit 1
fi

# SSH connection details
SSH_USER="asf"
SSH_HOST="asf-tb.duckdns.org"
SSH_PASS="ASF"

# The path to the script on the remote server
REMOTE_SCRIPT_PATH="./provision_vm.sh"

# Get command and VM name from arguments
COMMAND="$1"
VM_NAME="$2"

# Validate command
if [[ ! "$COMMAND" =~ ^(create|status|delete|start|stop)$ ]]; then
    log "Error: Invalid command '$COMMAND'. Must be one of: create, status, delete, start, stop"
    exit 1
fi

# Validate VM name format (username_vmname)
if [[ ! "$VM_NAME" =~ ^[a-zA-Z0-9_]+_[a-zA-Z0-9_-]+$ ]]; then
    log "Error: Invalid VM name format. Must be in format: username_vmname"
    exit 1
fi

# Extract username from VM name (everything before first underscore)
USERNAME="${VM_NAME%%_*}"

log "Command: $COMMAND, VM: $VM_NAME, User: $USERNAME"

# Check if sshpass is available
if ! command -v sshpass &> /dev/null; then
    log "Error: sshpass is not installed. Please install it with 'apt-get install sshpass'"
    exit 1
fi

# Check if we can resolve the host
if ! getent hosts "$SSH_HOST" >/dev/null 2>&1; then
    log "Error: Cannot resolve host $SSH_HOST"
    exit 1
fi

# Create a temporary file to capture output
TEMP_OUTPUT=$(mktemp)
log "Temporary output file: $TEMP_OUTPUT"

# Function to clean up temp file
cleanup() {
    if [ -f "$TEMP_OUTPUT" ]; then
        rm -f "$TEMP_OUTPUT"
        log "Temporary files cleaned up"
    fi
}
# Set up trap to ensure cleanup happens on script exit
trap cleanup EXIT

# Build the full SSH command
SSH_CMD="ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10"
FULL_CMD="$REMOTE_SCRIPT_PATH $COMMAND $VM_NAME"

log "Executing remote command: $FULL_CMD"

# Execute the remote command with sshpass and capture output
{
    # Use a timeout to prevent hanging
    if ! timeout 300 sshpass -p "$SSH_PASS" $SSH_CMD "$SSH_USER@$SSH_HOST" "$FULL_CMD" 2>&1; then
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ]; then
            log "ERROR: Command timed out after 5 minutes"
        else
            log "ERROR: Command failed with exit code $EXIT_CODE"
        fi
        exit $EXIT_CODE
    fi
} | tee "$TEMP_OUTPUT"

# Capture the exit status of the pipeline
PIPESTATUS=(${PIPESTATUS[@]})
SSHPASS_STATUS=${PIPESTATUS[0]}
TEE_STATUS=${PIPESTATUS[1]}

# Log the full output
log "Remote command output (exit code: $SSHPASS_STATUS):"
cat "$TEMP_OUTPUT" | while IFS= read -r line; do
    log "   $line"
done

# Check if the command was successful
if [ $SSHPASS_STATUS -eq 0 ]; then
    log "Remote command executed successfully"
    exit 0
else
    error_msg="Remote command failed with status $SSHPASS_STATUS"
    if [ $SSHPASS_STATUS -eq 5 ]; then
        error_msg="SSH authentication failed. Check credentials."
    elif [ $SSHPASS_STATUS -eq 255 ]; then
        error_msg="SSH connection failed. Check network and host availability."
    fi
    log "ERROR: $error_msg"
    exit $SSHPESTATUS
fi

log "Provisioning script completed successfully"