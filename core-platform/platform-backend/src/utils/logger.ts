import pino from 'pino';
import { getEnv } from '../config/env';

const env = getEnv();

// Create logger based on environment
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV === 'production'
      ? undefined // Use default JSON output in production
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Helper to create child logger with context
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
