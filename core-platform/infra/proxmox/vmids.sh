#!/bin/bash
# VMID definitions for Core Platform LXC containers
#
# VMID Convention:
# - Thousands digit: Platform family (1xxx)
# - Hundreds digit: Environment (1 = production, 0 = non-production)
# - Tens digit: Staging vs sandbox distinction (1 = sandbox/staging, 2 = production services)
# - Units digit: Instance index (0 = reserved/expansion)
#
# These are LXC container IDs, not VM IDs. All provisioning uses pct commands only.

# Production containers
VMID_PLATFORM_FRONTEND_PROD=1120  # Production app runtime host (Docker Compose: frontend + backend)
VMID_PLATFORM_BACKEND_PROD=1220   # Production Postgres host (DB-only)
VMID_PLATFORM_RESERVED=1320       # Reserved expansion/internal services host

# Staging/Sandbox container
VMID_PLATFORM_SANDBOX=1110        # Staging/sandbox app host (Docker Compose staging stack + staging Postgres)

# Export for use in other scripts
export VMID_PLATFORM_FRONTEND_PROD
export VMID_PLATFORM_BACKEND_PROD
export VMID_PLATFORM_RESERVED
export VMID_PLATFORM_SANDBOX
