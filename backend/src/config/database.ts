// Database connection configuration for production environments
// This helps prevent ECONNRESET errors in deployed environments

export const getDatabaseConfig = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // For production environments (Render, Railway, etc.), add connection pooling parameters
  if (process.env.NODE_ENV === 'production') {
    const url = new URL(databaseUrl);
    
    // Add connection pooling and timeout parameters for production
    const searchParams = new URLSearchParams(url.search);
    
    // Connection pooling settings
    if (!searchParams.has('connection_limit')) {
      searchParams.set('connection_limit', '10');
    }
    
    if (!searchParams.has('pool_timeout')) {
      searchParams.set('pool_timeout', '20');
    }
    
    // Connection timeout settings
    if (!searchParams.has('connect_timeout')) {
      searchParams.set('connect_timeout', '60');
    }
    
    // Socket timeout
    if (!searchParams.has('socket_timeout')) {
      searchParams.set('socket_timeout', '60');
    }
    
    // Enable connection recycling
    if (!searchParams.has('pgbouncer')) {
      searchParams.set('pgbouncer', 'true');
    }
    
    url.search = searchParams.toString();
    return url.toString();
  }
  
  return databaseUrl;
};

// Retry configuration for database operations
export const retryConfig = {
  retries: 3,
  retryDelay: 1000,
  maxRetryDelay: 5000,
};
