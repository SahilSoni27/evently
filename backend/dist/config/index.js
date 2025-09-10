"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVER_CONFIG = exports.REDIS_CONFIG = exports.JWT_CONFIG = exports.DATABASE_CONFIG = exports.config = void 0;
const zod_1 = require("zod");
// Environment variables validation
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().default('3001'),
    DATABASE_URL: zod_1.z.string().url(),
    REDIS_URL: zod_1.z.string().url(),
    JWT_SECRET: zod_1.z.string().min(16),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    API_URL: zod_1.z.string().url().optional(),
    FRONTEND_URL: zod_1.z.string().url().optional(),
});
// Validate environment variables
const env = envSchema.safeParse(process.env);
if (!env.success) {
    console.error('❌ Invalid environment variables:', env.error.format());
    process.exit(1);
}
const validatedEnv = env.data;
exports.config = {
    ...validatedEnv,
    PORT: parseInt(validatedEnv.PORT, 10),
};
// Database configuration
exports.DATABASE_CONFIG = {
    url: exports.config.DATABASE_URL,
};
// JWT configuration
exports.JWT_CONFIG = {
    secret: exports.config.JWT_SECRET,
    expiresIn: exports.config.JWT_EXPIRES_IN,
};
// Redis configuration
exports.REDIS_CONFIG = {
    url: exports.config.REDIS_URL,
};
// Server configuration
exports.SERVER_CONFIG = {
    port: exports.config.PORT,
    environment: exports.config.NODE_ENV,
    apiUrl: exports.config.API_URL,
    frontendUrl: exports.config.FRONTEND_URL,
};
