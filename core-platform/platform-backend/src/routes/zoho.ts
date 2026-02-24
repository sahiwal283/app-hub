import { Router, Request, Response } from 'express';
import { authenticate } from '../auth/middleware';
import { zohoService } from '../services/zohoService';
import { createLogger } from '../utils/logger';

const router = Router();
const logger = createLogger({ module: 'zoho-routes' });

// All Zoho routes require authentication
router.use(authenticate);

// Get leads
router.get('/leads', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token;
    const result = await zohoService.getLeads(token);

    if (result.error) {
      res.status(502).json({
        error: {
          code: result.error.code,
          message: 'Zoho service unavailable',
        },
      });
      return;
    }

    res.json({ data: result.data });
  } catch (error) {
    logger.error({ error }, 'Get leads error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      },
    });
  }
});

// Get accounts
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token;
    const result = await zohoService.getAccounts(token);

    if (result.error) {
      res.status(502).json({
        error: {
          code: result.error.code,
          message: 'Zoho service unavailable',
        },
      });
      return;
    }

    res.json({ data: result.data });
  } catch (error) {
    logger.error({ error }, 'Get accounts error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      },
    });
  }
});

// Create lead
router.post('/create-lead', async (req: Request, res: Response) => {
  try {
    const leadData = req.body;
    const token = req.cookies?.token;

    if (!leadData) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Lead data is required',
        },
      });
      return;
    }

    const result = await zohoService.createLead(leadData, token);

    if (result.error) {
      res.status(502).json({
        error: {
          code: result.error.code,
          message: 'Zoho service unavailable',
        },
      });
      return;
    }

    res.status(201).json({ data: result.data });
  } catch (error) {
    logger.error({ error }, 'Create lead error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      },
    });
  }
});

export default router;
