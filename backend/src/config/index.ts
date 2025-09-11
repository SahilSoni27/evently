import { z } from 'zod';

// Environment variables validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),  // Backend port should be 4000
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  API_URL: z.string().url().optional(),  // Backend's own URL
  FRONTEND_URL: z.string().url().optional(),  // Frontend URL for CORS
});

// Validate environment variables
const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error('❌ Invalid environment variables:', env.error.format());
  process.exit(1);
}

const validatedEnv = env.data;

export const config = {
  ...validatedEnv,
  PORT: parseInt(validatedEnv.PORT, 10),
};

// Database configuration
export const DATABASE_CONFIG = {
  url: config.DATABASE_URL,
};

// JWT configuration
export const JWT_CONFIG = {
  secret: config.JWT_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
};

// Redis configuration
export const REDIS_CONFIG = {
  url: config.REDIS_URL,
};

// Server configuration
export const SERVER_CONFIG = {
  port: config.PORT,
  environment: config.NODE_ENV,
  apiUrl: config.API_URL,
  frontendUrl: config.FRONTEND_URL,
};
