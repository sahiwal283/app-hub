# Database Backup & Recovery Strategy

This document describes the backup and recovery procedures for the Core Platform Postgres database running on LXC container **1220** (`platform-db-prod`).

## Overview

The production database (1220) requires regular logical backups using `pg_dump` to ensure data can be restored in case of corruption, accidental deletion, or disaster recovery.

**Important**: Proxmox snapshots (`vzdump`) are supplemental and useful for quick rollbacks, but they are NOT a replacement for logical database backups. Always maintain both.

## Backup Strategy

### Automated Nightly Backups

Set up a cron job on container 1220 to perform nightly backups:

```bash
# SSH into Proxmox host, then into container 1220
ssh root@192.168.1.190
pct enter 1220

# Create backup directory
mkdir -p /var/backups/postgres
chown postgres:postgres /var/backups/postgres

# Create backup script
cat > /usr/local/bin/backup-postgres.sh << 'EOF'
#!/bin/bash
# Postgres backup script for Core Platform

BACKUP_DIR="/var/backups/postgres"
DB_NAME="platform"  # Adjust to match your database name
DB_USER="platform_user"  # Adjust to match your database user
RETENTION_DAYS=14

# Create timestamped backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/platform_backup_${TIMESTAMP}.sql.gz}"

# Perform backup
sudo -u postgres pg_dump -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${BACKUP_FILE}"

# Remove backups older than retention period
find "${BACKUP_DIR}" -name "platform_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

# Log backup completion
echo "$(date): Backup completed: ${BACKUP_FILE}" >> /var/log/postgres-backup.log
EOF

# Make script executable
chmod +x /usr/local/bin/backup-postgres.sh

# Add to crontab (runs daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-postgres.sh") | crontab -
```

### Manual Backup

To create a backup immediately:

```bash
# SSH into container 1220
ssh root@192.168.1.190
pct enter 1220

# Run backup script manually
/usr/local/bin/backup-postgres.sh

# Or create backup directly
sudo -u postgres pg_dump -U platform_user -d platform | gzip > /var/backups/postgres/platform_backup_manual_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Backup Retention

- **Retention period**: 14 days (configurable in backup script)
- **Backup location**: `/var/backups/postgres` on container 1220
- **Backup format**: Compressed SQL dumps (`.sql.gz`)
- **Backup naming**: `platform_backup_YYYYMMDD_HHMMSS.sql.gz`

## Restore Procedures

### Restore to Fresh Database

**Warning**: This will replace all existing data in the target database.

```bash
# SSH into container 1220
ssh root@192.168.1.190
pct enter 1220

# List available backups
ls -lh /var/backups/postgres/

# Restore from backup (replace BACKUP_FILE with actual filename)
BACKUP_FILE="/var/backups/postgres/platform_backup_20240115_020000.sql.gz"
gunzip < "${BACKUP_FILE}" | sudo -u postgres psql -U platform_user -d platform

# Or restore to a new database for testing
sudo -u postgres createdb -U postgres platform_restore_test
gunzip < "${BACKUP_FILE}" | sudo -u postgres psql -U platform_user -d platform_restore_test
```

### Restore Specific Tables

To restore only specific tables from a backup:

```bash
# Extract and restore specific table
gunzip < "${BACKUP_FILE}" | grep -A 10000 "CREATE TABLE users" | sudo -u postgres psql -U platform_user -d platform
```

### Point-in-Time Recovery

For point-in-time recovery, you'll need:

1. Base backup (full `pg_dump`)
2. WAL (Write-Ahead Log) archives (if configured)
3. Postgres point-in-time recovery configuration

This is an advanced topic. For v1, rely on nightly backups and accept potential data loss up to 24 hours.

## Backup Verification

### Verify Backup Integrity

```bash
# Check backup file is valid
gunzip -t /var/backups/postgres/platform_backup_YYYYMMDD_HHMMSS.sql.gz

# Test restore to temporary database
sudo -u postgres createdb -U postgres platform_backup_test
gunzip < /var/backups/postgres/platform_backup_YYYYMMDD_HHMMSS.sql.gz | sudo -u postgres psql -U platform_user -d platform_backup_test

# Verify data exists
sudo -u postgres psql -U platform_user -d platform_backup_test -c "SELECT COUNT(*) FROM users;"

# Clean up test database
sudo -u postgres dropdb -U postgres platform_backup_test
```

### Monitor Backup Success

Check backup logs:

```bash
# View recent backup log entries
tail -n 50 /var/log/postgres-backup.log

# Verify backups are being created
ls -lth /var/backups/postgres/ | head -10
```

## Proxmox Snapshots (Supplemental)

Proxmox snapshots (`vzdump`) provide quick rollback capability but should not be the primary backup method:

```bash
# Create snapshot of container 1220
ssh root@192.168.1.190
vzdump 1220 --storage local --compress gzip

# List snapshots
ls -lh /var/lib/vz/dump/

# Restore from snapshot (WARNING: destroys current container state)
qmrestore /var/lib/vz/dump/vzdump-lxc-1220-YYYYMMDD_HHMMSS.tar.gz 1220
```

**Note**: Restoring a Proxmox snapshot will roll back the entire container, including OS updates and configuration changes. Use logical backups for database-only restores.

## Off-Site Backup (Recommended)

For disaster recovery, copy backups to an off-site location:

```bash
# Example: Copy backups to remote server via SCP
scp /var/backups/postgres/platform_backup_*.sql.gz user@backup-server:/backups/core-platform/

# Or use rsync for incremental sync
rsync -avz /var/backups/postgres/ user@backup-server:/backups/core-platform/
```

## Database Hardening

In addition to backups, ensure the database is properly secured:

### Postgres Configuration

Edit `/etc/postgresql/*/main/postgresql.conf` on container 1220:

```conf
# Listen only on private interface (not all interfaces)
listen_addresses = '192.168.1.30'  # Use container's private IP

# Require password authentication
password_encryption = scram-sha-256
```

### Access Control (pg_hba.conf)

Edit `/etc/postgresql/*/main/pg_hba.conf`:

```conf
# Only allow connections from app runtime container (1120)
host    platform    platform_user    192.168.1.20/32    scram-sha-256

# Deny all other connections
host    all         all              0.0.0.0/0          reject
```

### Strong Password Policy

- Use strong database passwords (minimum 16 characters, mixed case, numbers, symbols)
- Store passwords in environment variables, never in code
- Rotate passwords periodically
- Use different passwords for staging and production

## Recovery Testing

**Critical**: Regularly test your backup restoration process:

1. Create a test database
2. Restore from a recent backup
3. Verify data integrity
4. Document any issues and update procedures

Schedule recovery testing at least quarterly.

## Checklist

- [ ] Nightly backup cron job configured
- [ ] Backup directory created with proper permissions
- [ ] Backup retention policy set (14 days)
- [ ] Manual backup procedure tested
- [ ] Restore procedure tested on test database
- [ ] Backup verification process documented
- [ ] Off-site backup configured (if applicable)
- [ ] Database hardening applied (listen_addresses, pg_hba.conf)
- [ ] Strong database passwords set
- [ ] Recovery testing scheduled

## Troubleshooting

### Backup Fails

- Check disk space: `df -h /var/backups/postgres`
- Verify Postgres is running: `systemctl status postgresql`
- Check backup script permissions: `ls -l /usr/local/bin/backup-postgres.sh`
- Review cron logs: `journalctl -u cron`

### Restore Fails

- Verify backup file integrity: `gunzip -t backup_file.sql.gz`
- Check database user permissions
- Ensure target database exists
- Review Postgres logs: `tail -f /var/log/postgresql/postgresql-*.log`

### Backup Directory Full

- Increase retention cleanup frequency
- Move old backups to off-site storage
- Increase container disk size: `pct set 1220 -rootfs local-lvm:128`
