import { Router, Request, Response } from 'express';
import { PrismaClient, AppType } from '@prisma/client';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { createLogger } from '../../utils/logger';
import { auditLog } from '../../utils/audit';
import { ALLOWED_ICON_KEYS, normalizeIconKey } from '../../constants/iconKeys';

const router = Router();
const prisma = new PrismaClient();
const logger = createLogger({ module: 'admin-apps' });

function toApiApp(app: any) {
  const iconKey = normalizeIconKey(app.icon);
  return {
    ...app,
    iconKey,
  };
}

// Apply auth middleware to all routes
router.use(authenticate);
router.use(requireAdmin);

// List apps
router.get('/', async (req: Request, res: Response) => {
  try {
    const apps = await prisma.app.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ apps: apps.map((app) => toApiApp(app)) });
  } catch (error) {
    logger.error({ error }, 'List apps error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      },
    });
  }
});

// Get app by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const app = await prisma.app.findUnique({
      where: { id },
    });

    if (!app) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'App not found',
        },
      });
      return;
    }

    res.json({ app: toApiApp(app) });
  } catch (error) {
    logger.error({ error }, 'Get app error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      },
    });
  }
});

// Create app
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, slug, type, internalPath, externalUrl, iconKey, icon, version, isActive } = req.body;
    const resolvedIconKey = normalizeIconKey(iconKey ?? icon);

    if (!name || !slug || !type) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, slug, and type are required',
        },
      });
      return;
    }

    if (type === 'internal' && !internalPath) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Internal path is required for internal apps',
        },
      });
      return;
    }

    if (type === 'external' && !externalUrl) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'External URL is required for external apps',
        },
      });
      return;
    }

    if (iconKey !== undefined || icon !== undefined) {
      if (!resolvedIconKey) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid iconKey. Allowed values: ${ALLOWED_ICON_KEYS.join(', ')}`,
          },
        });
        return;
      }
    }

    // Check if slug already exists
    const existing = await prisma.app.findUnique({
      where: { slug },
    });

    if (existing) {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Slug already exists',
        },
      });
      return;
    }

    const app = await prisma.app.create({
      data: {
        name,
        slug,
        type: type as AppType,
        internalPath: type === 'internal' ? internalPath : null,
        externalUrl: type === 'external' ? externalUrl : null,
        icon: resolvedIconKey,
        version: version || '1.0.0',
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    // Auto-assign every newly created app to all admin users.
    const adminUsers = await prisma.user.findMany({
      where: { globalRole: 'admin' },
      select: { id: true },
    });

    if (adminUsers.length > 0) {
      await prisma.userApp.createMany({
        data: adminUsers.map((u) => ({
          userId: u.id,
          appId: app.id,
        })),
        skipDuplicates: true,
      });
    }

    logger.info({ appId: app.id, slug }, 'App created');
    await auditLog({
      userId: req.user!.user_id,
      action: 'app_created',
      metadata: { appId: app.id, slug, name },
    });

    res.status(201).json({ app: toApiApp(app) });
  } catch (error) {
    logger.error({ error }, 'Create app error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      },
    });
  }
});

// Update app
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, type, internalPath, externalUrl, iconKey, icon, version, isActive } = req.body;
    const resolvedIconKey = normalizeIconKey(iconKey ?? icon);

    const app = await prisma.app.findUnique({
      where: { id },
    });

    if (!app) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'App not found',
        },
      });
      return;
    }

    // If slug is being changed, check for conflicts
    if (slug && slug !== app.slug) {
      const existing = await prisma.app.findUnique({
        where: { slug },
      });

      if (existing) {
        res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'Slug already exists',
          },
        });
        return;
      }
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (type !== undefined) updateData.type = type as AppType;
    if (iconKey !== undefined || icon !== undefined) {
      if (!resolvedIconKey) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid iconKey. Allowed values: ${ALLOWED_ICON_KEYS.join(', ')}`,
          },
        });
        return;
      }
      updateData.icon = resolvedIconKey;
    }
    if (version !== undefined) updateData.version = version;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle path/URL based on type
    if (type === 'internal') {
      updateData.internalPath = internalPath;
      updateData.externalUrl = null;
    } else if (type === 'external') {
      updateData.externalUrl = externalUrl;
      updateData.internalPath = null;
    } else if (internalPath !== undefined || externalUrl !== undefined) {
      // Type not changed, but path/URL updated
      if (app.type === 'internal') {
        updateData.internalPath = internalPath;
      } else {
        updateData.externalUrl = externalUrl;
      }
    }

    const updated = await prisma.app.update({
      where: { id },
      data: updateData,
    });

    logger.info({ appId: id }, 'App updated');
    await auditLog({
      userId: req.user!.user_id,
      action: 'app_updated',
      metadata: { appId: id, changes: updateData },
    });

    res.json({ app: toApiApp(updated) });
  } catch (error) {
    logger.error({ error }, 'Update app error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      },
    });
  }
});

// Delete app (soft delete by setting isActive=false)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const app = await prisma.app.findUnique({
      where: { id },
    });

    if (!app) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'App not found',
        },
      });
      return;
    }

    // Soft delete by deactivating
    const updated = await prisma.app.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info({ appId: id }, 'App deactivated');
    await auditLog({
      userId: req.user!.user_id,
      action: 'app_deactivated',
      metadata: { appId: id, slug: app.slug },
    });

    res.json({ app: toApiApp(updated) });
  } catch (error) {
    logger.error({ error }, 'Delete app error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      },
    });
  }
});

export default router;
