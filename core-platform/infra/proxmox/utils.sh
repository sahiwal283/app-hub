#!/bin/bash
# Utility functions for Proxmox LXC provisioning
#
# These helpers provide idempotent container management operations
# using pct commands over SSH.

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging helpers
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Check SSH connectivity to Proxmox host
# Exits with non-zero status if connection fails
require_ssh() {
    log_info "Checking SSH connectivity to ${PROXMOX_USER}@${PROXMOX_HOST}..."
    if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "${PROXMOX_USER}@${PROXMOX_HOST}" "echo 'Connection successful'" >/dev/null 2>&1; then
        log_error "Cannot connect to ${PROXMOX_USER}@${PROXMOX_HOST}"
        log_error "Ensure SSH key-based authentication is configured"
        exit 1
    fi
    log_info "SSH connectivity confirmed"
}

# Execute command on Proxmox host via SSH
# Usage: ssh_cmd "command to run"
ssh_cmd() {
    local cmd="$1"
    log_info "Executing: ${cmd}"
    ssh "${PROXMOX_USER}@${PROXMOX_HOST}" "${cmd}"
}

# Check if LXC container exists
# Returns 0 if exists, 1 if not
# Usage: container_exists <VMID>
container_exists() {
    local vmid="$1"
    ssh_cmd "pct status ${vmid} >/dev/null 2>&1"
}

# Ensure container exists and has correct configuration
# Creates container if missing, updates config if exists
# Usage: ensure_container_exists <VMID> <hostname> <description> <cores> <memory> <rootfs> <onboot>
ensure_container_exists() {
    local vmid="$1"
    local hostname="$2"
    local description="$3"
    local cores="$4"
    local memory="$5"
    local rootfs="$6"
    local onboot="$7"
    
    if container_exists "${vmid}"; then
        log_info "Container ${vmid} (${hostname}) exists, converging configuration..."
        
        # Update configuration to ensure it matches desired state
        ssh_cmd "pct set ${vmid} -hostname '${hostname}'" || true
        ssh_cmd "pct set ${vmid} -description '${description}'" || true
        ssh_cmd "pct set ${vmid} -cores ${cores}" || true
        ssh_cmd "pct set ${vmid} -memory ${memory}" || true
        ssh_cmd "pct set ${vmid} -rootfs ${rootfs}" || true
        ssh_cmd "pct set ${vmid} -onboot ${onboot}" || true
        
        # Set LXC features for Docker nesting if unprivileged
        if [ "${UNPRIVILEGED}" = "1" ]; then
            ssh_cmd "pct set ${vmid} -features '${LXC_FEATURES}'" || true
        fi
        
        # Configure networking
        if [ "${USE_STATIC_IPS}" = "1" ]; then
            local ip_var="CONTAINER_${vmid}_IP"
            local container_ip="${!ip_var}"
            if [ -n "${container_ip}" ]; then
                ssh_cmd "pct set ${vmid} -net0 name=eth0,bridge=${BRIDGE},ip=${container_ip},gw=${GATEWAY}" || true
            else
                log_warn "Static IP requested but not configured for VMID ${vmid}, using DHCP"
                ssh_cmd "pct set ${vmid} -net0 name=eth0,bridge=${BRIDGE},ip=dhcp" || true
            fi
        else
            ssh_cmd "pct set ${vmid} -net0 name=eth0,bridge=${BRIDGE},ip=dhcp" || true
        fi
        
        log_info "Container ${vmid} configuration updated"
    else
        log_info "Creating container ${vmid} (${hostname}) from template ${LXC_TEMPLATE}..."
        
        # Build pct create command
        local create_cmd="pct create ${vmid} ${LXC_TEMPLATE}"
        create_cmd="${create_cmd} -hostname '${hostname}'"
        create_cmd="${create_cmd} -description '${description}'"
        create_cmd="${create_cmd} -cores ${cores}"
        create_cmd="${create_cmd} -memory ${memory}"
        create_cmd="${create_cmd} -rootfs ${rootfs}"
        create_cmd="${create_cmd} -onboot ${onboot}"
        
        # Add unprivileged flag if needed
        if [ "${UNPRIVILEGED}" = "1" ]; then
            create_cmd="${create_cmd} -unprivileged 1"
            create_cmd="${create_cmd} -features '${LXC_FEATURES}'"
        fi
        
        # Configure networking
        if [ "${USE_STATIC_IPS}" = "1" ]; then
            local ip_var="CONTAINER_${vmid}_IP"
            local container_ip="${!ip_var}"
            if [ -n "${container_ip}" ]; then
                create_cmd="${create_cmd} -net0 name=eth0,bridge=${BRIDGE},ip=${container_ip},gw=${GATEWAY}"
            else
                log_warn "Static IP requested but not configured for VMID ${vmid}, using DHCP"
                create_cmd="${create_cmd} -net0 name=eth0,bridge=${BRIDGE},ip=dhcp"
            fi
        else
            create_cmd="${create_cmd} -net0 name=eth0,bridge=${BRIDGE},ip=dhcp"
        fi
        
        ssh_cmd "${create_cmd}"
        log_info "Container ${vmid} created successfully"
    fi
}

# Ensure container is running
# Starts container if stopped
# Usage: ensure_container_running <VMID>
ensure_container_running() {
    local vmid="$1"
    
    local status=$(ssh_cmd "pct status ${vmid} 2>/dev/null | awk '{print \$2}'" || echo "unknown")
    
    if [ "${status}" = "running" ]; then
        log_info "Container ${vmid} is already running"
    elif [ "${status}" = "stopped" ]; then
        log_info "Starting container ${vmid}..."
        ssh_cmd "pct start ${vmid}"
        log_info "Container ${vmid} started"
    else
        log_warn "Container ${vmid} status is '${status}', attempting to start..."
        ssh_cmd "pct start ${vmid}" || {
            log_error "Failed to start container ${vmid}"
            return 1
        }
        log_info "Container ${vmid} started"
    fi
}
