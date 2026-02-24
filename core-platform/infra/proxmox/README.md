# Proxmox LXC Provisioning for Core Platform

This directory contains scripts for provisioning LXC containers on Proxmox for the Core Platform infrastructure.

## Architecture

The Core Platform uses separate LXC containers by design:

- **1120** (`platform-frontend-prod`): Production app runtime host running Docker Compose (frontend + backend)
- **1220** (`platform-db-prod`): Production Postgres database host (DB-only)
- **1110** (`platform-sandbox`): Staging/sandbox environment with Docker Compose staging stack + staging Postgres
- **1320** (`platform-reserved`): Reserved expansion/internal services host

**Important**: These scripts provision the LXC container hosts only. Application deployment (Docker containers) is handled separately via `docker-compose.yml` files in the main repository.

## Prerequisites

1. **Proxmox host** accessible at `192.168.1.190` (configurable in `config.sh`)
2. **SSH key-based authentication** to `root@PROXMOX_HOST` (password auth not supported)
3. **LXC template** available on Proxmox host (default: `debian-12-standard`, configurable in `config.sh`)
4. **Bash shell** on your local machine (macOS or Linux)

## Configuration

Edit `config.sh` to customize:

- Proxmox host IP and user
- LXC template path
- Storage pool and network bridge
- Resource allocation (CPU, memory, disk)
- Container hostnames and descriptions
- Static IP configuration (optional, defaults to DHCP)

### LXC Mode: Unprivileged with Docker Nesting

The scripts default to **unprivileged LXC containers** with Docker nesting enabled. This is the recommended approach for:

- **Security**: Unprivileged containers have reduced attack surface
- **Docker compatibility**: Nesting feature (`nesting=1`) allows Docker to run inside LXC
- **Resource isolation**: Better isolation between containers

If you need privileged containers, set `UNPRIVILEGED=0` in `config.sh` and adjust features accordingly.

### Networking

By default, containers use **DHCP** on the configured bridge (`vmbr0`). To use static IPs:

1. Set `USE_STATIC_IPS=1` in `config.sh`
2. Configure IP addresses for each container (see `CONTAINER_*_IP` variables)
3. Set gateway IP in `GATEWAY` variable

## Usage

### Provision All Containers

```bash
cd core-platform/infra/proxmox
./provision-platform.sh
```

The script is **idempotent**: safe to run multiple times. It will:
- Create containers if they don't exist
- Update configuration if containers exist
- Start stopped containers

### Individual Container Operations

The scripts use `pct` commands over SSH. You can also manage containers directly:

```bash
# SSH into Proxmox host
ssh root@192.168.1.190

# List containers
pct list

# Check container status
pct status 1120

# Start/stop container
pct start 1120
pct stop 1120

# View container config
pct config 1120
```

## Upgrading Container Resources

To increase resources for a container (e.g., more RAM for the database):

```bash
# SSH into Proxmox host
ssh root@192.168.1.190

# Increase memory (example: 8GB for DB container)
pct set 1220 -memory 8192

# Increase CPU cores
pct set 1220 -cores 4

# Increase rootfs size (example: 64GB)
pct set 1220 -rootfs local-lvm:64

# Restart container to apply changes
pct restart 1220
```

## Static IP Configuration

If you need static IPs for containers:

1. Edit `config.sh`:
   ```bash
   USE_STATIC_IPS=1
   CONTAINER_1120_IP="192.168.1.20/24"
   CONTAINER_1220_IP="192.168.1.30/24"
   # ... etc
   GATEWAY="192.168.1.1"
   ```

2. Re-run provisioning script to apply network changes

## Docker-in-LXC Setup

After provisioning containers, you need to install Docker inside each app runtime container (1120 and 1110):

```bash
# SSH into container
ssh root@192.168.1.190
pct enter 1120

# Install Docker (Debian/Ubuntu example)
apt-get update
apt-get install -y docker.io docker-compose

# Enable Docker service
systemctl enable docker
systemctl start docker

# Verify Docker works
docker ps
```

**Note**: The DB container (1220) runs Postgres directly, not in Docker, so Docker installation is not required there.

## Single-Node vs Cluster

These scripts assume a **single-node Proxmox** setup. If you're running a Proxmox cluster:

- Ensure commands execute on the node that owns the container IDs
- You may need to specify the node in `pct` commands or use `pvesh` API
- Container IDs must be unique across the cluster

## Troubleshooting

### SSH Connection Fails

- Verify SSH key is added to Proxmox host: `ssh-copy-id root@192.168.1.190`
- Test connection: `ssh root@192.168.1.190 "echo test"`
- Check firewall rules on Proxmox host

### Container Creation Fails

- Verify LXC template exists: `pvesm list local | grep vztmpl`
- Check storage pool has space: `pvesm status`
- Verify network bridge exists: `ip link show vmbr0`

### Docker Doesn't Work in Container

- Ensure container has `nesting=1` feature: `pct config <VMID> | grep features`
- Verify unprivileged container has proper mapping: `pct config <VMID> | grep unprivileged`
- Check Docker daemon logs: `journalctl -u docker`

## Next Steps

After provisioning containers:

1. Install Docker in app runtime containers (1120, 1110)
2. Deploy application using `docker-compose.yml` (see main README)
3. Configure Nginx reverse proxy to route traffic
4. Set up database backups (see main README for DB backup strategy)

## Security Notes

- Containers are isolated at the LXC level
- Database container (1220) should only accept connections from app runtime container (1120)
- Use firewall rules to restrict access between containers
- Never expose database ports publicly
