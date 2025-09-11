"use strict";
/**
 * Retry utility with exponential backoff for handling concurrency conflicts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryError = void 0;
exports.withRetry = withRetry;
exports.generateIdempotencyKey = generateIdempotencyKey;
exports.withOptimisticLocking = withOptimisticLocking;
class RetryError extends Error {
    constructor(message, lastError) {
        super(message);
        this.lastError = lastError;
        this.name = 'RetryError';
    }
}
exports.RetryError = RetryError;
/**
 * Execute a function with retry logic and exponential backoff
 */
async function withRetry(operation, options = {}) {
    const { maxRetries = 3, initialDelay = 100, maxDelay = 5000, backoffFactor = 2, jitter = true } = options;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            // Don't retry on the last attempt
            if (attempt === maxRetries) {
                throw new RetryError(`Operation failed after ${maxRetries + 1} attempts: ${lastError.message}`, lastError);
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
    throw lastError;
}
/**
 * Check if an error is retryable
 */
function isRetryableError(error) {
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
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Generate a unique idempotency key
 */
function generateIdempotencyKey(userId, eventId, timestamp) {
    const ts = timestamp || Date.now();
    return `booking_${userId}_${eventId}_${ts}`;
}
/**
 * Optimistic locking wrapper for Prisma operations
 */
async function withOptimisticLocking(operation, retryOptions) {
    return withRetry(operation, {
        maxRetries: 5,
        initialDelay: 50,
        maxDelay: 2000,
        backoffFactor: 1.5,
        jitter: true,
        ...retryOptions
    });
}
