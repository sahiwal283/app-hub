#!/bin/bash
# Proxmox LXC provisioning script for Core Platform
#
# This script provisions LXC containers for the Core Platform infrastructure.
# It is idempotent: safe to run multiple times without recreating containers.
#
# Prerequisites:
# - SSH key-based authentication to root@PROXMOX_HOST
# - LXC template available on Proxmox host
# - pct command available on Proxmox host
#
# Usage:
#   ./provision-platform.sh

set -euo pipefail

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source configuration and utilities
source "${SCRIPT_DIR}/config.sh"
source "${SCRIPT_DIR}/vmids.sh"
source "${SCRIPT_DIR}/utils.sh"

# Main provisioning function
main() {
    log_info "Starting Core Platform LXC provisioning"
    log_info "Target host: ${PROXMOX_USER}@${PROXMOX_HOST}"
    
    # Check SSH connectivity
    require_ssh
    
    # Provision production app runtime host (1120)
    log_info "Provisioning production app runtime host (VMID ${VMID_PLATFORM_FRONTEND_PROD})..."
    ensure_container_exists \
        "${VMID_PLATFORM_FRONTEND_PROD}" \
        "${CONTAINER_1120_HOSTNAME}" \
        "${CONTAINER_1120_DESCRIPTION}" \
        "${CONTAINER_1120_CORES}" \
        "${CONTAINER_1120_MEMORY}" \
        "${CONTAINER_1120_ROOTFS}" \
        "${CONTAINER_1120_ONBOOT}"
    ensure_container_running "${VMID_PLATFORM_FRONTEND_PROD}"
    
    # Provision production database host (1220)
    log_info "Provisioning production database host (VMID ${VMID_PLATFORM_BACKEND_PROD})..."
    ensure_container_exists \
        "${VMID_PLATFORM_BACKEND_PROD}" \
        "${CONTAINER_1220_HOSTNAME}" \
        "${CONTAINER_1220_DESCRIPTION}" \
        "${CONTAINER_1220_CORES}" \
        "${CONTAINER_1220_MEMORY}" \
        "${CONTAINER_1220_ROOTFS}" \
        "${CONTAINER_1220_ONBOOT}"
    ensure_container_running "${VMID_PLATFORM_BACKEND_PROD}"
    
    # Provision staging/sandbox host (1110)
    log_info "Provisioning staging/sandbox host (VMID ${VMID_PLATFORM_SANDBOX})..."
    ensure_container_exists \
        "${VMID_PLATFORM_SANDBOX}" \
        "${CONTAINER_1110_HOSTNAME}" \
        "${CONTAINER_1110_DESCRIPTION}" \
        "${CONTAINER_1110_CORES}" \
        "${CONTAINER_1110_MEMORY}" \
        "${CONTAINER_1110_ROOTFS}" \
        "${CONTAINER_1110_ONBOOT}"
    # Note: staging container may not auto-start (onboot=0), so we start it explicitly
    ensure_container_running "${VMID_PLATFORM_SANDBOX}"
    
    # Provision reserved/expansion host (1320)
    log_info "Provisioning reserved/expansion host (VMID ${VMID_PLATFORM_RESERVED})..."
    ensure_container_exists \
        "${VMID_PLATFORM_RESERVED}" \
        "${CONTAINER_1320_HOSTNAME}" \
        "${CONTAINER_1320_DESCRIPTION}" \
        "${CONTAINER_1320_CORES}" \
        "${CONTAINER_1320_MEMORY}" \
        "${CONTAINER_1320_ROOTFS}" \
        "${CONTAINER_1320_ONBOOT}"
    # Reserved container typically doesn't auto-start, but we can start it if needed
    # Uncomment the next line if you want to start the reserved container:
    # ensure_container_running "${VMID_PLATFORM_RESERVED}"
    
    log_info "Core Platform LXC provisioning completed successfully"
    log_info ""
    log_info "Next steps:"
    log_info "1. SSH into each container and install Docker + Docker Compose"
    log_info "2. Deploy application using docker-compose.yml (prod) or docker-compose.staging.yml (staging)"
    log_info "3. Configure Nginx reverse proxy to route traffic to containers"
    log_info ""
    log_info "Container summary:"
    log_info "  - ${VMID_PLATFORM_FRONTEND_PROD}: ${CONTAINER_1120_HOSTNAME} (Production app runtime)"
    log_info "  - ${VMID_PLATFORM_BACKEND_PROD}: ${CONTAINER_1220_HOSTNAME} (Production database)"
    log_info "  - ${VMID_PLATFORM_SANDBOX}: ${CONTAINER_1110_HOSTNAME} (Staging/sandbox)"
    log_info "  - ${VMID_PLATFORM_RESERVED}: ${CONTAINER_1320_HOSTNAME} (Reserved/expansion)"
}

# Run main function
main "$@"
