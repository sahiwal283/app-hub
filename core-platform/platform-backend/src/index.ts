import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { validateEnv, getEnv } from './config/env';
import { logger, createLogger } from './utils/logger';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import healthRoutes from './routes/health';
import adminUsersRoutes from './routes/admin/users';
import adminAppsRoutes from './routes/admin/apps';
import adminAuditRoutes from './routes/admin/audit';
import zohoRoutes from './routes/zoho';
import metaRoutes from './routes/meta';

// Validate environment variables on startup
validateEnv();
const env = getEnv();

const app = express();
const prisma = new PrismaClient();

// Security middleware
app.use(helmet());
app.disable('x-powered-by');

// CORS configuration (strict same-origin for v1)
if (env.CORS_ORIGIN) {
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
} else {
  // Default: same-origin only
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (same-origin)
        if (!origin) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'));
        }
      },
      credentials: true,
    })
  );
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use(
  pinoHttp({
    logger,
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        return 'warn';
      } else if (res.statusCode >= 500 || err) {
        return 'error';
      }
      return 'info';
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
    },
  })
);

// Rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
app.use('/api', healthRoutes);
app.use('/api', authRoutes); // /api/logout, /api/me, /api/change-password
app.use('/api/admin/users', adminLimiter, adminUsersRoutes);
app.use('/api/admin/apps', adminLimiter, adminAppsRoutes);
app.use('/api/admin/audit', adminLimiter, adminAuditRoutes);
app.use('/api/zoho', zohoRoutes);
app.use('/api', metaRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err, req: { method: req.method, url: req.url } }, 'Unhandled error');

  if (env.NODE_ENV === 'production') {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
      },
    });
  } else {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
        stack: err.stack,
      },
    });
  }
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const port = parseInt(env.PORT, 10);

async function startServer() {
  try {
    // Run migrations
    logger.info('Running database migrations...');
    const { execSync } = require('child_process');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    logger.info('Database migrations completed');

    app.listen(port, () => {
      logger.info(`Server listening on port ${port}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();
