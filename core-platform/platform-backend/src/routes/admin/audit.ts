import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { createLogger } from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();
const logger = createLogger({ module: 'admin-audit' });

// Apply auth middleware to all routes
router.use(authenticate);
router.use(requireAdmin);

// List audit logs
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    res.json({
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        username: log.user?.username,
        action: log.action,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
      pagination: {
        limit,
        offset,
        total: await prisma.auditLog.count(),
      },
    });
  } catch (error) {
    logger.error({ error }, 'List audit logs error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      },
    });
  }
});

export default router;
