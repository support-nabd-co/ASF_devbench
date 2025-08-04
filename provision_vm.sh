#!/bin/bash

# Check if enough arguments were provided for the remote script.
# The remote 'provision_vm.sh' script expects at least 2 arguments: <command> <vm_name>.
if [ "$#" -lt 2 ]; then
    echo "Error: Please provide at least two arguments for the remote command."
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

# Construct the full command to be executed on the remote server.
# "$@" expands to all arguments passed to *this* script, each as a separate word,
# ensuring they are correctly passed to REMOTE_SCRIPT_PATH.
REMOTE_COMMAND_ARGS="$@"

echo "Connecting to $SSH_HOST and running: $REMOTE_SCRIPT_PATH $REMOTE_COMMAND_ARGS"

# Use sshpass to provide the password and ssh to run the command.
# The -o StrictHostKeyChecking=no option is included as per your request.
# We pass the remote script path as the first argument to ssh,
# and then "$@" to pass all arguments from the local script to the remote script.
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" "$REMOTE_SCRIPT_PATH" "$@"

# The line you mentioned: REMOTE_COMMAND="./provision_vm.sh $ command$SCRIPT_ARG"
# is not needed with this approach, as "$@" directly handles passing all arguments.