import { getEnv } from '../config/env';
import { createLogger } from '../utils/logger';

const env = getEnv();
const logger = createLogger({ module: 'zoho-service' });

interface ZohoResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

class ZohoService {
  private baseUrl: string;
  private forwardAuth: boolean;

  constructor() {
    this.baseUrl = env.ZOHO_SERVICE_URL;
    this.forwardAuth = env.ZOHO_FORWARD_AUTH;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    authToken?: string
  ): Promise<ZohoResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Forward auth token if enabled and provided
      if (this.forwardAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(
          { endpoint, status: response.status, error: errorText },
          'Zoho service request failed'
        );
        return {
          error: {
            code: 'ZOHO_ERROR',
            message: `Zoho service returned ${response.status}`,
          },
        };
      }

      const data = (await response.json()) as T;
      return { data };
    } catch (error: any) {
      clearTimeout(timeout);

      if (error.name === 'AbortError') {
        logger.error({ endpoint }, 'Zoho service request timeout');
        return {
          error: {
            code: 'TIMEOUT',
            message: 'Request to Zoho service timed out',
          },
        };
      }

      logger.error({ endpoint, error }, 'Zoho service request error');
      return {
        error: {
          code: 'NETWORK_ERROR',
          message: 'Failed to connect to Zoho service',
        },
      };
    }
  }

  async getLeads(authToken?: string): Promise<ZohoResponse> {
    return this.request('/leads', { method: 'GET' }, authToken);
  }

  async getAccounts(authToken?: string): Promise<ZohoResponse> {
    return this.request('/accounts', { method: 'GET' }, authToken);
  }

  async createLead(leadData: any, authToken?: string): Promise<ZohoResponse> {
    return this.request(
      '/create-lead',
      {
        method: 'POST',
        body: JSON.stringify(leadData),
      },
      authToken
    );
  }
}

export const zohoService = new ZohoService();
