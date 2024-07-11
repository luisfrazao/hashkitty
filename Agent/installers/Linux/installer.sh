#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset

AGENT_DIR="/usr/local/Hashkitty/"
CONFIG_DIR="/etc/Hashkitty/Agent"
SERVICE_FILE="/etc/systemd/system/Hashkitty-agent.service"
SERVICE_NAME="Hashkitty-agent.service"

error_exit() {
    printf "Error: %s\n" "$1" >&2
    exit 1
}

install_agent() {
    if [[ $EUID -ne 0 ]]; then
        error_exit "This script must be run as root."
    fi

    read -rp "Enter the IP or domain of your Middleware: " websocket_uri

    printf "Installing agent...\n"

    script_dir=$(dirname "$(readlink -f "$0")")
    cd "$script_dir" || error_exit "Failed to change directory!"

    if ! mkdir -p "$AGENT_DIR"; then
        error_exit "Failed to create agent directory!"
    fi

    if ! cp -r ./dist/Agent/ "$AGENT_DIR"; then
        error_exit "Failed to copy agent files!"
    fi
    AGENT_DIR="$AGENT_DIR/Agent"
    chmod +x "$AGENT_DIR/Agent"

    if ! mkdir -p "$CONFIG_DIR"; then
        error_exit "Failed to create config directory!"
    fi

    local config_file="$CONFIG_DIR/config.json"
    local config_content='{"websocket_uri": "ws://'"$websocket_uri"':8484"}'
    if ! printf "%s" "$config_content" > "$config_file"; then
        error_exit "Failed to write to config file!"
    fi

    if ! cp ./dist/Hashkitty-agent.service "$SERVICE_FILE"; then
        error_exit "Failed to copy agent service file!"
    fi

    if ! systemctl enable "$SERVICE_NAME"; then
        error_exit "Failed to enable agent service!"
    fi

    if ! systemctl start "$SERVICE_NAME"; then
        error_exit "Failed to start agent service!"
    fi

    printf "Agent installed successfully!\n"
}

uninstall_agent() {
    if [[ $EUID -ne 0 ]]; then
        error_exit "This script must be run as root."
    fi

    printf "Uninstalling agent...\n"

    if systemctl is-active --quiet "$SERVICE_NAME"; then
        if ! systemctl stop "$SERVICE_NAME"; then
            error_exit "Failed to stop agent service!"
        fi
    fi

    if systemctl is-enabled --quiet "$SERVICE_NAME"; then
        if ! systemctl disable "$SERVICE_NAME"; then
            error_exit "Failed to disable agent service!"
        fi
    fi

    if ! rm -f "$SERVICE_FILE"; then
        error_exit "Failed to remove agent service file!"
    fi

    if ! rm -rf "$AGENT_DIR/Agent"; then
        error_exit "Failed to remove agent directory!"
    fi

    if ! rm -rf "$CONFIG_DIR"; then
        error_exit "Failed to remove config directory!"
    fi

    printf "Agent uninstalled successfully!\n"
}

main() {
    local action="${1:-install}"
    case "$action" in
        -u)
            uninstall_agent
            ;;
        install)
            install_agent
            ;;
        *)
            printf "Usage: %s [-u (uninstall)]\n" "$(basename "$0")"
            exit 1
            ;;
    esac
}

main "$@"
