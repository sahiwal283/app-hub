import { z } from 'zod';

// Environment variable validation schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  
  // Server
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('4000'),
  APP_VERSION: z.string().optional(),
  APP_BUILD: z.string().optional(),
  APP_COMMIT: z.string().optional(),
  
  // CORS
  CORS_ORIGIN: z.union([z.string().url(), z.literal('')]).optional(),
  
  // Cookie
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),
  
  // Zoho
  ZOHO_SERVICE_URL: z.string().url(),
  ZOHO_FORWARD_AUTH: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),
  
  // Admin seed (optional, only for initial setup)
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

let env: Env;

export function validateEnv(): Env {
  try {
    env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment variable validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export function getEnv(): Env {
  if (!env) {
    env = validateEnv();
  }
  return env;
}
