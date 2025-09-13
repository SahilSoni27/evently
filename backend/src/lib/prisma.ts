import { PrismaClient } from '@prisma/client';
import { getDatabaseConfig } from '../config/database';

// Global variable for Prisma client (prevents multiple instances in serverless)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create a single Prisma instance with production-ready configuration
const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: getDatabaseConfig(),
    },
  },
});

// Prevent multiple instances in development (hot reload)
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Test database connection on startup with retry logic
let retryCount = 0;
const maxRetries = 3;

const connectWithRetry = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    retryCount++;
    console.error(`❌ Database connection failed (attempt ${retryCount}/${maxRetries}):`, error);
    
    if (retryCount < maxRetries) {
      console.log(`⏳ Retrying database connection in 5 seconds...`);
      setTimeout(connectWithRetry, 5000);
    } else {
      console.error('❌ Database connection failed after maximum retries');
    }
  }
};

connectWithRetry();

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
