import { Router, Request, Response } from 'express';
import { PrismaClient, GlobalRole } from '@prisma/client';
import { hashPassword } from '../../auth/password';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { createLogger } from '../../utils/logger';
import { auditLog } from '../../utils/audit';

const router = Router();
const prisma = new PrismaClient();
const logger = createLogger({ module: 'admin-users' });

// Apply auth middleware to all routes
router.use(authenticate);
router.use(requireAdmin);

// List users
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        globalRole: true,
        isActive: true,
        createdAt: true,
        userApps: {
          select: {
            appId: true,
          },
        },
        _count: {
          select: {
            userApps: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        globalRole: user.globalRole,
        isActive: user.isActive,
        createdAt: user.createdAt,
        appCount: user._count.userApps,
        assignedAppIds: user.userApps.map((ua) => ua.appId),
      })),
    });
  } catch (error) {
    logger.error({ error }, 'List users error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      },
    });
  }
});

// Create user
router.post('/', async (req: Request, res: Response) => {
  try {
    const { username, password, globalRole, isActive, appIds } = req.body;

    if (!username || !password) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username and password are required',
        },
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters',
        },
      });
      return;
    }

    // Check if username already exists
    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Username already exists',
        },
      });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        globalRole: (globalRole as GlobalRole) || GlobalRole.user,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    // Assign apps if provided
    if (appIds && Array.isArray(appIds) && appIds.length > 0) {
      await prisma.userApp.createMany({
        data: appIds.map((appId: string) => ({
          userId: user.id,
          appId,
        })),
        skipDuplicates: true,
      });
    }

    logger.info({ userId: user.id, username }, 'User created');
    await auditLog({
      userId: req.user!.user_id,
      action: 'user_created',
      metadata: { targetUserId: user.id, username },
    });

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        globalRole: user.globalRole,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Create user error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      },
    });
  }
});

// Update user
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { globalRole, isActive, appIds } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    // Update user
    const updated = await prisma.user.update({
      where: { id },
      data: {
        globalRole: globalRole !== undefined ? (globalRole as GlobalRole) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    // Update app assignments if provided
    if (appIds !== undefined && Array.isArray(appIds)) {
      // Remove all existing assignments
      await prisma.userApp.deleteMany({
        where: { userId: id },
      });

      // Add new assignments
      if (appIds.length > 0) {
        await prisma.userApp.createMany({
          data: appIds.map((appId: string) => ({
            userId: id,
            appId,
          })),
          skipDuplicates: true,
        });
      }
    }

    logger.info({ userId: id }, 'User updated');
    await auditLog({
      userId: req.user!.user_id,
      action: 'user_updated',
      metadata: { targetUserId: id, changes: { globalRole, isActive } },
    });

    res.json({
      user: {
        id: updated.id,
        username: updated.username,
        globalRole: updated.globalRole,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Update user error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      },
    });
  }
});

// Set user password (admin only)
router.post('/:id/password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters',
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    logger.info({ userId: id }, 'User password set by admin');
    await auditLog({
      userId: req.user!.user_id,
      action: 'user_password_set',
      metadata: { targetUserId: id },
    });

    res.json({ message: 'Password set successfully' });
  } catch (error) {
    logger.error({ error }, 'Set password error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      },
    });
  }
});

export default router;
