import { PrismaClientKnownRequestError, PrismaClientUnknownRequestError } from '@prisma/client/runtime/library';
import { retryConfig } from '../config/database';

// Database error types that should trigger retries
const RETRYABLE_ERRORS = [
  'ECONNRESET',
  'ENOTFOUND',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'P1001', // Prisma: Connection timeout
  'P1002', // Prisma: Connection timeout
  'P1008', // Prisma: Operations timed out
  'P1017', // Prisma: Connection closed
];

// Utility to check if an error should trigger a retry
const isRetryableError = (error: any): boolean => {
  if (!error) return false;
  
  // Check error code or message for retryable patterns
  const errorCode = error.code || '';
  const errorMessage = error.message || '';
  
  return RETRYABLE_ERRORS.some(pattern => 
    errorCode.includes(pattern) || errorMessage.includes(pattern)
  );
};

// Sleep utility for delays
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper for database operations
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries = retryConfig.retries
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Only retry for specific error types
      if (!isRetryableError(error)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        retryConfig.retryDelay * Math.pow(2, attempt),
        retryConfig.maxRetryDelay
      );
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(
        `Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}): ${errorMessage}. Retrying in ${delay}ms...`
      );
      
      await sleep(delay);
    }
  }
  
  // Throw the last error if all retries failed
  throw lastError;
}

// Enhanced error handling for Prisma operations
export function handleDatabaseError(error: any): never {
  console.error('Database operation failed:', error);
  
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        throw new Error('A record with this information already exists');
      case 'P2025':
        throw new Error('Related record not found');
      case 'P2003':
        throw new Error('Foreign key constraint violation');
      case 'P1001':
      case 'P1002':
        throw new Error('Database connection failed. Please try again.');
      case 'P1008':
        throw new Error('Database operation timed out. Please try again.');
      default:
        throw new Error(`Database error: ${error.message}`);
    }
  }
  
  if (error instanceof PrismaClientUnknownRequestError) {
    throw new Error('An unexpected database error occurred. Please try again.');
  }
  
  // Handle connection errors
  if (isRetryableError(error)) {
    throw new Error('Database connection error. Please try again.');
  }
  
  // Re-throw other errors
  throw error;
}
