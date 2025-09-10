/**
 * Retry utility with exponential backoff for handling concurrency conflicts
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
}

export class RetryError extends Error {
  constructor(message: string, public lastError: Error) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 5000,
    backoffFactor = 2,
    jitter = true
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw new RetryError(
          `Operation failed after ${maxRetries + 1} attempts: ${lastError.message}`,
          lastError
        );
      }
      
      // Don't retry on non-retryable errors
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      let delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay);
      
      // Add jitter to avoid thundering herd
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }
      
      console.log(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`, {
        error: lastError.message,
        attempt: attempt + 1,
        maxRetries: maxRetries + 1
      });
      
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Prisma optimistic locking error
  if (error?.code === 'P2034') {
    return true;
  }
  
  // Database connection errors
  if (error?.code === 'P1001' || error?.code === 'P1017') {
    return true;
  }
  
  // Transaction serialization errors
  if (error?.message?.includes('serialization failure') || 
      error?.message?.includes('deadlock detected') ||
      error?.message?.includes('could not serialize access')) {
    return true;
  }
  
  // Capacity conflicts (custom error from our booking logic)
  if (error?.message?.includes('Insufficient capacity') || 
      error?.message?.includes('Event capacity changed')) {
    return true;
  }
  
  // HTTP 409 Conflict
  if (error?.status === 409) {
    return true;
  }
  
  return false;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a unique idempotency key
 */
export function generateIdempotencyKey(userId: string, eventId: string, timestamp?: number): string {
  const ts = timestamp || Date.now();
  return `booking_${userId}_${eventId}_${ts}`;
}

/**
 * Optimistic locking wrapper for Prisma operations
 */
export async function withOptimisticLocking<T>(
  operation: () => Promise<T>,
  retryOptions?: RetryOptions
): Promise<T> {
  return withRetry(operation, {
    maxRetries: 5,
    initialDelay: 50,
    maxDelay: 2000,
    backoffFactor: 1.5,
    jitter: true,
    ...retryOptions
  });
}
