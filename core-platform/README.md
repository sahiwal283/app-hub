# Core Platform v1.3.1

Internal app platform for centralized authentication, user management, and app launching.

## Architecture

The Core Platform consists of:

- **Platform Frontend** (Next.js): User dashboard and admin interface
- **Platform Backend** (Express + TypeScript): Authentication, user management, and API
- **Platform Database** (Postgres): User data, app registry, and audit logs
- **Proxmox LXC Containers**: Infrastructure hosting
  - `1120`: Production app runtime host (Docker Compose)
  - `1220`: Production Postgres database host
  - `1110`: Staging/sandbox environment
  - `1320`: Reserved expansion host

## Features

- **Centralized Authentication**: JWT-based auth with username/password
- **User Management**: Admin interface for user creation, role assignment, and app access
- **App Registry**: Register internal and external apps with metadata
- **App Launching**: Dashboard shows only assigned apps, launches via `/apps/{slug}`
- **Audit Logging**: Track admin actions and system changes
- **Zoho Integration**: Server-to-server integration with existing Zoho service

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- Proxmox host with SSH access (for production deployment)
- Existing Nginx reverse proxy container
- Existing Zoho service container

## Quick Start (Local Development)

1. **Clone and setup**:
   ```bash
   cd core-platform
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start services**:
   ```bash
   docker-compose up --build
   ```

3. **Run database migrations** (first time only):
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

4. **Seed initial data** (first time only):
   ```bash
   docker-compose exec backend npm run prisma:seed
   ```

5. **Access the platform**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000/api
   - Default admin: Use credentials from `.env` (ADMIN_USERNAME, ADMIN_PASSWORD)

## Environment Configuration

### Production Environment Variables

See `.env.example` for all required variables. Key variables:

- `DATABASE_URL`: Postgres connection string (points to LXC 1220 in production)
- `JWT_SECRET`: Secret key for JWT signing (minimum 32 characters)
- `ZOHO_SERVICE_URL`: URL to existing Zoho service
- `COOKIE_DOMAIN`: Cookie domain (e.g., `booute.duckdns.com`)
- `COOKIE_SECURE`: Set to `true` in production (HTTPS required)
- `APP_VERSION` (optional): Release version exposed by `/api/meta/version` (falls back to backend `package.json` version)
- `APP_BUILD` (optional): Build identifier exposed by `/api/meta/version` (example: git SHA, CI run ID)
- `APP_COMMIT` (optional): Commit SHA exposed by `/api/meta/version`

### Staging Environment

Use `docker-compose.staging.yml` with separate environment variables:

```bash
cp .env.staging.example .env.staging
# Edit .env.staging
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

## Deployment

### Proxmox LXC Provisioning

1. **Provision LXC containers**:
   ```bash
   cd infra/proxmox
   ./provision-platform.sh
   ```

2. **Install Docker in app runtime containers** (1120 and 1110):
   ```bash
   ssh root@192.168.1.190
   pct enter 1120
   apt-get update && apt-get install -y docker.io docker-compose
   systemctl enable docker && systemctl start docker
   ```

3. **Deploy application**:
   ```bash
   # On LXC 1120 (production)
   git clone <your-repo-url> /opt/core-platform
   cd /opt/core-platform
   cp .env.example .env
   # Edit .env with production values
   docker-compose up -d
   ```

### Database Setup (LXC 1220)

1. **Install Postgres**:
   ```bash
   ssh root@192.168.1.190
   pct enter 1220
   apt-get update && apt-get install -y postgresql
   ```

2. **Configure Postgres**:
   - Edit `/etc/postgresql/*/main/postgresql.conf`: Set `listen_addresses` to container IP
   - Edit `/etc/postgresql/*/main/pg_hba.conf`: Allow connections from 1120 only
   - Create database and user
   - Set up backups (see `infra/db-backup-recovery.md`)

3. **Update backend DATABASE_URL** to point to 1220 IP

### Nginx Integration

1. **Merge Nginx snippet**:
   - Copy configuration from `nginx.snippet.conf`
   - Merge into your existing Nginx config
   - Adjust IP addresses to match your containers
   - Configure SSL certificates

2. **Test routing**:
   - `/` → Platform frontend
   - `/api` → Platform backend
   - `/services/zoho` → Zoho service
   - `/apps/{slug}` → Individual apps

## Workflows

### Local Development

```bash
# Start all services
docker-compose up --build

# Run migrations
docker-compose exec backend npx prisma migrate dev

# View logs
docker-compose logs -f backend
```

### Staging Deployment (LXC 1110)

```bash
# SSH into staging container
ssh root@192.168.1.190
pct enter 1110

# Deploy
cd /opt/core-platform
git pull
export APP_VERSION="$(tr -d '\n' < VERSION | sed 's/^v//')"
export APP_BUILD="staging-$(date +%Y%m%d%H%M)"
export APP_COMMIT="$(git rev-parse --short HEAD)"
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d --build
```

### Production Deployment (LXC 1120 + 1220)

```bash
# SSH into production app container
ssh root@192.168.1.190
pct enter 1120

# Deploy
cd /opt/core-platform
git pull
export APP_VERSION="$(tr -d '\n' < VERSION | sed 's/^v//')"
export APP_BUILD="prod-$(date +%Y%m%d%H%M)"
export APP_COMMIT="$(git rev-parse --short HEAD)"
docker-compose up -d --build

# Run migrations (if needed)
docker-compose exec backend npx prisma migrate deploy
```

### Deployment Verification (Version + Asset Freshness)

Run these checks right after staging/prod deployment:

```bash
# 1) Health check
curl -sf http://localhost:4000/api/health

# 2) Version contract (must match deployed artifact/tag)
curl -sf http://localhost:4000/api/meta/version

# 3) Confirm HTML references hashed CSS (cache-busted filename)
curl -s http://localhost:3000 | rg -o "/_next/static/css/[^\"]+\\.css" -m 1

# 4) Confirm static asset is immutable-cacheable
ASSET_PATH="$(curl -s http://localhost:3000 | rg -o "/_next/static/css/[^\"]+\\.css" -m 1)"
curl -sI "http://localhost:3000${ASSET_PATH}" | rg "Cache-Control|ETag|Last-Modified"
```

## Database Migrations

- **Local/Dev**: `npx prisma migrate dev` (creates migration files)
- **Staging/Prod**: `npx prisma migrate deploy` (applies migrations only)

Migrations run automatically on backend startup in production.

## Security

### JWT Secret Management

- **Never commit secrets** to version control
- Use different secrets for staging and production
- Rotate secrets periodically (invalidates all sessions)
- Minimum 32 characters

### Cookie Security

- `HttpOnly`: Prevents JavaScript access
- `SameSite=Lax`: Reduces CSRF risk
- `Secure=true`: HTTPS only in production
- `Path=/`: Available site-wide

### Database Hardening

- Listen only on private interface (not `*`)
- Restrict access via `pg_hba.conf` (only allow 1120)
- Use strong passwords (16+ characters)
- Regular backups (see `infra/db-backup-recovery.md`)

## App Integration

### For App Authors

Internal apps must:

1. **Validate JWT** using shared `JWT_SECRET`
2. **Check assigned apps** - verify app slug exists in `assigned_apps` claim
3. **Reject unauthorized** - return 401/403 if validation fails

Example middleware (Node.js/Express):

```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET!;
const APP_SLUG = 'my-app-slug';

export function validatePlatformAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    
    // Check app assignment
    if (!payload.assigned_apps?.includes(APP_SLUG)) {
      return res.status(403).json({ error: 'App access denied' });
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Existing Apps

- Existing apps can remain external (no code changes)
- Register in platform admin UI as external apps
- Platform controls visibility only
- JWT validation adoption is optional and gradual

## Versioning

This project uses semantic versioning (v1.3.1).

- **Tags**: Git tags mark releases (e.g., `v1.0.0`)
- **Rollback**: Deploy specific tag: `git checkout v1.0.0 && docker-compose up -d --build`
- **VERSION file**: Contains current version string
- **Runtime endpoint**: `GET /api/meta/version` returns `{ "version": "1.4.0", "build": "ci-102", "commit": "a1b2c3d" }`

### Creating a Release

```bash
# Update VERSION file
echo "v1.0.1" > VERSION

# Commit and tag
git add VERSION
git commit -m "chore: bump version to v1.0.1"
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin main --tags
```

## Production Checklist

Before going live, verify:

- [ ] DuckDNS resolves to correct IP
- [ ] Router forwards ports 80/443 to Nginx container
- [ ] SSL certificate is valid and auto-renewal configured
- [ ] `JWT_SECRET` is set and secure (32+ characters)
- [ ] Admin seed password changed or seed disabled
- [ ] Database backups configured and tested
- [ ] Firewall rules applied (DB only accessible from 1120)
- [ ] Health endpoint returns OK: `curl https://booute.duckdns.com/api/health`
- [ ] All environment variables set correctly
- [ ] Nginx routing configured and tested
- [ ] Logs are being collected (stdout/stderr)

## Troubleshooting

### Backend won't start

- Check environment variables: `docker-compose exec backend env`
- Verify database connectivity: `docker-compose exec backend npx prisma db pull`
- Check logs: `docker-compose logs backend`

### Frontend can't reach backend

- Verify API base URL: `NEXT_PUBLIC_API_BASE=/api`
- Check CORS configuration
- Verify Nginx routing

### Database connection fails

- Verify `DATABASE_URL` points to correct host/port
- Check Postgres is listening: `netstat -tlnp | grep 5432`
- Verify `pg_hba.conf` allows connections from app container
- Test connection: `psql $DATABASE_URL`

### JWT validation fails

- Verify `JWT_SECRET` matches across all services
- Check token expiration (default: 8 hours)
- Verify cookie domain and path settings

## Documentation

- **Proxmox Provisioning**: `infra/proxmox/README.md`
- **Database Backups**: `infra/db-backup-recovery.md`
- **Nginx Integration**: `nginx.snippet.conf` (with inline comments)

## Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Review documentation in `infra/` directory
3. Verify environment configuration
4. Check health endpoint: `/api/health`

## License

Internal use only.

## Release Notes

### v1.3.1

- Fixed app launch behavior to keep the Core Platform open in the original tab
- Removed same-tab fallback that could trigger duplicate navigation when opening a new tab

### v1.3.0

- Applied the Earthy Tones palette across the full platform UI
- Updated navigation, cards, tables, modals, forms, badges, and action buttons to consistent theme colors
- Standardized status and role chips to palette-based styling

### v1.2.0

- Dashboard launches apps in a new browser tab and shifts focus to that tab
- Launch flow now includes popup-blocker fallback to same-tab navigation

### v1.1.0

- Auto-assign newly created apps to all admin users
- Fixed dashboard launch behavior for external apps (open `externalUrl` directly)
- Added user-management app assignment controls in admin UX
- Deployment/runtime hardening fixes for production containers

### v1.0.0 (Initial Release)

- Core authentication system (JWT, username/password)
- User management (admin interface)
- App registry and assignment
- Dashboard with app launching
- Audit logging
- Zoho service integration
- Proxmox LXC provisioning automation
- Database backup/recovery procedures
- Production-ready security hardening
