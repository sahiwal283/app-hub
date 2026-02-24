#!/bin/bash
# Proxmox LXC provisioning configuration for Core Platform
#
# This file centralizes all configuration for LXC container provisioning.
# Adjust values as needed for your Proxmox environment.

# Proxmox host connection
PROXMOX_HOST="192.168.1.190"
PROXMOX_USER="root"

# LXC template (adjust to match your available template)
# Common examples:
# - local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst
# - local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst
LXC_TEMPLATE="local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst"

# Storage and networking defaults
STORAGE="local-lvm"           # Storage pool for container rootfs
BRIDGE="vmbr0"                # Network bridge
DNS_SERVERS="8.8.8.8 8.8.4.4" # DNS servers (space-separated)

# Default resource allocation (can be overridden per container)
DEFAULT_CORES=2
DEFAULT_MEMORY=2048           # MB
DEFAULT_ROOTFS_SIZE=32        # GB

# LXC mode: unprivileged with Docker nesting support
# This is the recommended default for security and Docker compatibility.
# If you need privileged containers, set UNPRIVILEGED=0 and adjust features accordingly.
UNPRIVILEGED=1
LXC_FEATURES="nesting=1"      # Required for Docker-in-LXC

# Container-specific overrides
# Production app runtime host (1120)
CONTAINER_1120_HOSTNAME="platform-frontend-prod"
CONTAINER_1120_DESCRIPTION="Core Platform - Production App Runtime (Frontend + Backend)"
CONTAINER_1120_ONBOOT=1
CONTAINER_1120_CORES=${DEFAULT_CORES}
CONTAINER_1120_MEMORY=${DEFAULT_MEMORY}
CONTAINER_1120_ROOTFS="${STORAGE}:${DEFAULT_ROOTFS_SIZE}"

# Production database host (1220) - needs more resources
CONTAINER_1220_HOSTNAME="platform-db-prod"
CONTAINER_1220_DESCRIPTION="Core Platform - Production Postgres Database"
CONTAINER_1220_ONBOOT=1
CONTAINER_1220_CORES=4        # More cores for DB
CONTAINER_1220_MEMORY=4096        # More RAM for DB
CONTAINER_1220_ROOTFS="${STORAGE}:64"  # More disk for DB

# Reserved/expansion host (1320)
CONTAINER_1320_HOSTNAME="platform-reserved"
CONTAINER_1320_DESCRIPTION="Core Platform - Reserved/Expansion Host"
CONTAINER_1320_ONBOOT=0        # Don't auto-start reserved container
CONTAINER_1320_CORES=${DEFAULT_CORES}
CONTAINER_1320_MEMORY=${DEFAULT_MEMORY}
CONTAINER_1320_ROOTFS="${STORAGE}:${DEFAULT_ROOTFS_SIZE}"

# Staging/sandbox host (1110)
CONTAINER_1110_HOSTNAME="platform-sandbox"
CONTAINER_1110_DESCRIPTION="Core Platform - Staging/Sandbox Environment"
CONTAINER_1110_ONBOOT=0        # Optional auto-start for staging
CONTAINER_1110_CORES=${DEFAULT_CORES}
CONTAINER_1110_MEMORY=${DEFAULT_MEMORY}
CONTAINER_1110_ROOTFS="${STORAGE}:${DEFAULT_ROOTFS_SIZE}"

# Networking mode: DHCP (default) or static IP
# Set USE_STATIC_IPS=1 to enable static IP configuration
USE_STATIC_IPS=0

# Static IP configuration (only used if USE_STATIC_IPS=1)
# Adjust these IPs to match your network subnet
CONTAINER_1120_IP="192.168.1.20/24"
CONTAINER_1220_IP="192.168.1.30/24"
CONTAINER_1110_IP="192.168.1.40/24"
CONTAINER_1320_IP="192.168.1.50/24"
GATEWAY="192.168.1.1"

# Export all variables for use in other scripts
export PROXMOX_HOST PROXMOX_USER LXC_TEMPLATE
export STORAGE BRIDGE DNS_SERVERS
export DEFAULT_CORES DEFAULT_MEMORY DEFAULT_ROOTFS_SIZE
export UNPRIVILEGED LXC_FEATURES
export CONTAINER_1120_HOSTNAME CONTAINER_1120_DESCRIPTION CONTAINER_1120_ONBOOT
export CONTAINER_1120_CORES CONTAINER_1120_MEMORY CONTAINER_1120_ROOTFS
export CONTAINER_1220_HOSTNAME CONTAINER_1220_DESCRIPTION CONTAINER_1220_ONBOOT
export CONTAINER_1220_CORES CONTAINER_1220_MEMORY CONTAINER_1220_ROOTFS
export CONTAINER_1320_HOSTNAME CONTAINER_1320_DESCRIPTION CONTAINER_1320_ONBOOT
export CONTAINER_1320_CORES CONTAINER_1320_MEMORY CONTAINER_1320_ROOTFS
export CONTAINER_1110_HOSTNAME CONTAINER_1110_DESCRIPTION CONTAINER_1110_ONBOOT
export CONTAINER_1110_CORES CONTAINER_1110_MEMORY CONTAINER_1110_ROOTFS
export USE_STATIC_IPS
export CONTAINER_1120_IP CONTAINER_1220_IP CONTAINER_1110_IP CONTAINER_1320_IP GATEWAY
