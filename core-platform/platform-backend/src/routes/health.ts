import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getEnv } from '../config/env';
import { createLogger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();
const logger = createLogger({ module: 'health' });
const env = getEnv();

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  checks: {
    database: {
      status: 'ok' | 'down';
      latency?: number;
    };
    zoho: {
      status: 'ok' | 'down';
      latency?: number;
    };
  };
}

async function checkDatabase(): Promise<{ status: 'ok' | 'down'; latency?: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    return { status: 'ok', latency };
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return { status: 'down' };
  }
}

async function checkZoho(): Promise<{ status: 'ok' | 'down'; latency?: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${env.ZOHO_SERVICE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const latency = Date.now() - start;
    if (response.ok) {
      return { status: 'ok', latency };
    } else {
      return { status: 'down', latency };
    }
  } catch (error) {
    logger.warn({ error }, 'Zoho health check failed');
    return { status: 'down' };
  }
}

router.get('/health', async (req: Request, res: Response) => {
  const [dbCheck, zohoCheck] = await Promise.all([
    checkDatabase(),
    checkZoho(),
  ]);

  // Determine overall status
  let status: 'ok' | 'degraded' | 'down' = 'ok';
  if (dbCheck.status === 'down') {
    status = 'down';
  } else if (zohoCheck.status === 'down') {
    status = 'degraded';
  }

  const healthStatus: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbCheck,
      zoho: zohoCheck,
    },
  };

  const statusCode = status === 'ok' ? 200 : status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

export default router;
