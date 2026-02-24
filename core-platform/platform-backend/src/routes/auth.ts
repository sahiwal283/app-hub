import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../auth/password';
import { signToken } from '../auth/jwt';
import { authenticate } from '../auth/middleware';
import { getEnv } from '../config/env';
import { createLogger } from '../utils/logger';
import { auditLog } from '../utils/audit';
import rateLimit from 'express-rate-limit';
import { normalizeIconKey } from '../constants/iconKeys';

const router = Router();
const prisma = new PrismaClient();
const logger = createLogger({ module: 'auth' });
const env = getEnv();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many login attempts, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username and password are required',
        },
      });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        userApps: {
          include: {
            app: {
              select: {
                slug: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    // Always return generic error message to prevent user enumeration
    if (!user || !user.isActive) {
      logger.warn({ username }, 'Login attempt failed: user not found or inactive');
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        },
      });
      return;
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      logger.warn({ userId: user.id, username }, 'Login attempt failed: invalid password');
      await auditLog({
        userId: user.id,
        action: 'login_failed',
        metadata: { username },
      });
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        },
      });
      return;
    }

    // Get assigned app slugs (only active apps)
    const assignedApps = user.userApps
      .filter((ua) => ua.app.isActive)
      .map((ua) => ua.app.slug);

    // Create JWT payload
    const payload = {
      user_id: user.id,
      username: user.username,
      global_role: user.globalRole,
      assigned_apps: assignedApps,
    };

    const token = signToken(payload);

    // Set cookie
    const cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'lax' | 'strict' | 'none';
      maxAge: number;
      path: string;
      domain?: string;
    } = {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      path: '/',
    };

    if (env.COOKIE_DOMAIN) {
      cookieOptions.domain = env.COOKIE_DOMAIN;
    }

    res.cookie('token', token, cookieOptions);

    logger.info({ userId: user.id, username }, 'User logged in successfully');
    await auditLog({
      userId: user.id,
      action: 'login_success',
      metadata: { username },
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        globalRole: user.globalRole,
        assignedApps,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Login error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during login',
      },
    });
  }
});

// Logout
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  const cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    expires: Date;
    path: string;
    domain?: string;
  } = {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    expires: new Date(0), // Immediate expiration
    path: '/',
  };

  if (env.COOKIE_DOMAIN) {
    cookieOptions.domain = env.COOKIE_DOMAIN;
  }

  res.cookie('token', '', cookieOptions);
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.user_id },
      include: {
        userApps: {
          include: {
            app: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                internalPath: true,
                externalUrl: true,
                icon: true,
                version: true,
                isActive: true,
              },
            },
          },
        },
      },
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

    // Filter to only active apps
    const apps = user.userApps
      .filter((ua) => ua.app.isActive)
      .map((ua) => ({
        ...ua.app,
        iconKey: normalizeIconKey(ua.app.icon),
      }));

    res.json({
      user: {
        id: user.id,
        username: user.username,
        globalRole: user.globalRole,
        isActive: user.isActive,
        apps,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get user error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      },
    });
  }
});

// Change password
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Current password and new password are required',
        },
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'New password must be at least 8 characters',
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.user_id },
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

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Current password is incorrect',
        },
      });
      return;
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    logger.info({ userId: user.id }, 'Password changed');
    await auditLog({
      userId: user.id,
      action: 'password_changed',
      metadata: {},
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error({ error }, 'Change password error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      },
    });
  }
});

export default router;
